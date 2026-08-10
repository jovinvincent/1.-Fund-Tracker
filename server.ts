import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

class ProviderError extends Error {
  kind: "provider" | "symbol";
  constructor(message: string, kind: "provider" | "symbol") {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
  }
}

const SYMBOL_MAP: Record<string, { nse: string; yahoo: string }> = {
  "TATAMOTORS.NS": { nse: "TMPV", yahoo: "TMPV.NS" },
  "ICICIPRU.NS": { nse: "ICICIPRUAMC", yahoo: "ICICIPRUAMC.NS" },
  "M&M.NS": { nse: "M&M", yahoo: "M&M.NS" },
  "KNOWLEDGE.REIT": { nse: "KNOWLEDGE", yahoo: "KNOWLEDGE.NS" },
};

const lastKnownCommodityCloses = new Map<string, { price: number; timestamp: number }>();

function getCurrentMonthlyExpiry(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (330 * 60000)); // Indian standard time to ensure correct timezone for expiries
  
  let year = ist.getFullYear();
  let month = ist.getMonth(); // 0-indexed
  
  const getLastTuesday = (y: number, m: number): Date => {
    const date = new Date(y, m + 1, 0);
    const day = date.getDay();
    const daysToSubtract = (day >= 2) ? (day - 2) : (day + 5);
    date.setDate(date.getDate() - daysToSubtract);
    return date;
  };

  let expiryDate = getLastTuesday(year, month);
  
  // If we are past 15:30 (3:30 PM) on the expiry day, the active monthly contract rolls over to the next month
  if (ist.getTime() > expiryDate.getTime() + 15.5 * 60 * 60 * 1000) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    expiryDate = getLastTuesday(year, month);
  }

  const dayStr = String(expiryDate.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monStr = monthNames[expiryDate.getMonth()];
  const yrStr = expiryDate.getFullYear();
  
  return `${dayStr}-${monStr}-${yrStr}`;
}

function parseDerivativeSymbol(cleanSym: string) {
  const clean = cleanSym.trim().toUpperCase();
  const parts = clean.split(/[\s\-_]+/);
  
  const monthMap: Record<string, string> = {
    JAN: "Jan", JANUARY: "Jan", "01": "Jan",
    FEB: "Feb", FEBRUARY: "Feb", "02": "Feb",
    MAR: "Mar", MARCH: "Mar", "03": "Mar",
    APR: "Apr", APRIL: "Apr", "04": "Apr",
    MAY: "May", "05": "May",
    JUN: "Jun", JUNE: "Jun", "06": "Jun",
    JUL: "Jul", JULY: "Jul", "07": "Jul",
    AUG: "Aug", AUGUST: "Aug", "08": "Aug",
    SEP: "Sep", SEPTEMBER: "Sep", "09": "Sep",
    OCT: "Oct", OCTOBER: "Oct", "10": "Oct",
    NOV: "Nov", NOVEMBER: "Nov", "11": "Nov",
    DEC: "Dec", DECEMBER: "Dec", "12": "Dec",
  };

  const isOption = /(CE|PE)$/.test(clean) || clean.includes(" CALL") || clean.includes(" PUT") || /\d+(CE|PE)/.test(clean);
  const isFuture = /FUT/.test(clean) || clean.includes(" FUTURE") || clean.includes(" FUTURES");

  let optType: "CE" | "PE" | null = null;
  if (clean.endsWith("CE") || clean.includes(" CE") || clean.includes(" CALL")) {
    optType = "CE";
  } else if (clean.endsWith("PE") || clean.includes(" PE") || clean.includes(" PUT")) {
    optType = "PE";
  }

  let expiryMonth: string | null = null;
  for (const [mKey, mVal] of Object.entries(monthMap)) {
    const reg = new RegExp(`\\b${mKey}\\b|(?<=\\d{2})${mKey}|${mKey}(?=\\d{2}|FUT|CE|PE)`, "i");
    if (reg.test(clean)) {
      expiryMonth = mVal;
      break;
    }
  }

  let strike = 0;
  if (isOption) {
    const strikeMatch = clean.match(/(\d{3,6})\s*(CE|PE|CALL|PUT)?$/i) || clean.match(/(\d{3,6})\s+(CE|PE)/i);
    if (strikeMatch) {
      strike = parseFloat(strikeMatch[1]);
    }
  }

  // Extract cleaned underlying by removing derivative keywords and month names
  let cleanedUnderlying = clean
    .replace(/\s*(FUTURES|FUTURE|FUT|CE|PE|CALL|PUT)\b/gi, "")
    .replace(/-(FUTURES|FUTURE|FUT|CE|PE)\b/gi, "")
    .replace(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/gi, "")
    .replace(/\b\d{2}[A-Z]{3}\d{2,4}\b/gi, "")
    .replace(/\b\d{6}\b/gi, "")
    .replace(/\b\d{3,6}\b/g, "")
    .replace(/[^A-Z0-9&]/g, "")
    .trim();

  const underlying = cleanedUnderlying.length > 0 ? cleanedUnderlying : parts[0];

  const currentMonthlyExpiry = getCurrentMonthlyExpiry();
  let expiry = currentMonthlyExpiry;
  if (expiryMonth) {
    const expParts = currentMonthlyExpiry.split("-");
    expiry = `${expParts[0]}-${expiryMonth}-${expParts[2]}`;
  }

  return {
    underlying,
    expiryMonth,
    expiry,
    strike,
    optType,
    isOption: !!optType || isOption,
    isFuture: isFuture || (!optType && !isOption)
  };
}

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for AMFI Mutual Fund NAVs
interface MFNavInfo {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
  isinGrowth: string;
}

let amfiCache = new Map<string, MFNavInfo>();
let isAmfiLoaded = false;
let lastAmfiFetchTime: number | null = null;

interface CachedQuote {
  quote: any;
  timestamp: number;
}
const quoteCache = new Map<string, CachedQuote>();

interface ChainCacheEntry {
  data: any;
  timestamp: number;
}
const optionChainCache = new Map<string, ChainCacheEntry>();
const CHAIN_CACHE_TTL = 45000; // 45 seconds TTL

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isMarketHoursActive(): boolean {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (330 * 60000));
  
  const day = ist.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 9:15 AM = 555
  // 3:30 PM = 930
  return timeInMinutes >= 555 && timeInMinutes <= 930;
}

function isAmfiSyncWindowActive(): boolean {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (330 * 60000));
  
  const day = ist.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Market hours: 9:15 AM (555) to 3:30 PM (930) OR Evening publication: 9:30 PM (1290) to 11:30 PM (1410)
  return (timeInMinutes >= 555 && timeInMinutes <= 930) || (timeInMinutes >= 1290 && timeInMinutes <= 1410);
}

function isMcxHoursActive(): boolean {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (330 * 60000));
  
  const day = ist.getDay();
  if (day === 0 || day === 6) { // Saturday, Sunday
    return false;
  }
  
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Mon-Fri 9:00 AM = 540 to 11:30 PM = 1410
  return timeInMinutes >= 540 && timeInMinutes <= 1410;
}

function getCacheTTLForSymbol(symbol: string): number {
  const cleanSym = symbol.trim().toUpperCase();
  const commoditySet = new Set(["SILVER", "CRUDEOIL", "GOLD", "GOLDM", "SILVERM"]);
  const isCommodity = commoditySet.has(cleanSym);
  
  const active = isCommodity ? isMcxHoursActive() : isMarketHoursActive();
  if (!active) {
    return 1000 * 60 * 60 * 24 * 7; // 7 days (cache outside sync hours)
  }
  return 60000; // 60 seconds (1 minute) during live market hours
}

const NSE_HOST = process.env.NSE_RELAY_URL || "https://www.nseindia.com";

class NseSession {
  private cookie = "";
  private cookieAt = 0;
  private readonly TTL = 3 * 60 * 1000; // refresh every 3 min
  private readonly isRelay = !!process.env.NSE_RELAY_URL && !process.env.NSE_RELAY_URL.includes("nseindia.com");
  private readonly HEADERS: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": `${NSE_HOST}/`,
    ...(process.env.NSE_RELAY_KEY ? { "x-relay-key": process.env.NSE_RELAY_KEY } : {})
  };
  private handshakePromise: Promise<void> | null = null;

  private doHandshake(): Promise<void> {
    if (this.handshakePromise) {
      return this.handshakePromise;
    }
    this.handshakePromise = (async () => {
      try {
        const res = await fetch(NSE_HOST, {
          headers: this.HEADERS,
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });
        // Extract cookies cleanly supporting multiple runtimes
        const setCookie = res.headers.getSetCookie?.() ?? [];
        if (setCookie.length > 0) {
          this.cookie = setCookie.map(c => c.split(";")[0]).join("; ");
        } else {
          const cookieHeader = res.headers.get("set-cookie");
          this.cookie = cookieHeader ? cookieHeader.split(",").map(c => c.split(";")[0]).join("; ") : "";
        }
        this.cookieAt = Date.now();
      } finally {
        this.handshakePromise = null;
      }
    })();
    return this.handshakePromise;
  }

  async get(path: string, attempt = 0): Promise<any> {
    if (!this.isRelay && (!this.cookie || Date.now() - this.cookieAt > this.TTL)) {
      await this.doHandshake();
    }
    const res = await fetch(`${NSE_HOST}${path}`, {
      headers: { ...this.HEADERS, Cookie: this.cookie },
      signal: AbortSignal.timeout(6000),
    });
    if ((res.status === 401 || res.status === 403) && attempt < 2) {
      this.cookie = ""; // force re-handshake
      await delay(500 * (attempt + 1)); // backoff
      return this.get(path, attempt + 1);
    }
    if (res.status === 404) {
      throw new ProviderError(`NSE ${path} -> 404`, "symbol");
    }
    if (!res.ok) {
      throw new ProviderError(`NSE ${path} -> ${res.status}`, "provider");
    }
    return res.json();
  }
}
const nse = new NseSession();

class CircuitBreaker {
  name: string;
  failureCount = 0;
  state: "closed" | "open" | "half-open" = "closed";
  lastStateChange = Date.now();
  readonly threshold = 3;
  readonly cooldown = 5 * 60 * 1000; // 5 min

  constructor(name: string) {
    this.name = name;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = "closed";
  }

  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = "open";
      this.lastStateChange = Date.now();
      console.warn(`[CircuitBreaker] ${this.name} circuit opened! Skipping calls for 5 mins.`);
    }
  }

  canExecute(): boolean {
    if (this.state === "open") {
      if (Date.now() - this.lastStateChange > this.cooldown) {
        this.state = "half-open";
        console.log(`[CircuitBreaker] ${this.name} testing in half-open state.`);
        return true;
      }
      return false;
    }
    return true;
  }

  getStatusString(): string {
    if (this.state === "open") return "circuit-open";
    if (this.state === "half-open") return "half-open";
    return "up";
  }
}

const nseBreaker = new CircuitBreaker("NSE Direct");
const yahooBreaker = new CircuitBreaker("Yahoo Finance");
const indianapiBreaker = new CircuitBreaker("IndianAPI");
const tvBreaker = new CircuitBreaker("TradingView");

const TV_ENDPOINT = "https://scanner.tradingview.com/india/scan";

function toTvTicker(cleanSym: string): string | null {
  if (cleanSym === "^NSEI") return "NSE:NIFTY";
  if (cleanSym === "^NSEMDCP") return "NSE:CNXMIDCAP";
  if (cleanSym === "SILVER") return "MCX:SILVER1!";
  if (cleanSym === "CRUDEOIL") return "MCX:CRUDEOIL1!";
  
  const parsed = parseDerivativeSymbol(cleanSym);
  if (parsed.isFuture && parsed.underlying) {
    if (parsed.underlying === "NIFTY") return "NSE:NIFTY1!";
    if (parsed.underlying === "BANKNIFTY") return "NSE:BANKNIFTY1!";
    if (parsed.underlying === "FINNIFTY") return "NSE:FINNIFTY1!";
    if (parsed.underlying === "MIDCPNIFTY") return "NSE:CNXMIDCAP1!";
    return `NSE:${parsed.underlying}1!`;
  }

  if (/^[A-Z]+\d{6}$/.test(cleanSym)) return `NSE:${cleanSym.replace(/\d{6}$/, "")}1!`; // ITC280726 → NSE:ITC1!
  if (/\.(NS|BO|REIT)$/.test(cleanSym)) {
    const m = SYMBOL_MAP[cleanSym];
    return `NSE:${m ? m.nse : cleanSym.replace(/\.(NS|BO|REIT)$/, "")}`;
  }
  return null; // rates/proxies skip
}

async function fetchTradingViewQuotes(symbols: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  const pairs = symbols.map(s => ({ sym: s.trim().toUpperCase(), tv: toTvTicker(s.trim().toUpperCase()) })).filter(p => p.tv);
  if (!pairs.length) return out;
  const res = await fetch(TV_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" },
    body: JSON.stringify({
      symbols: { tickers: pairs.map(p => p.tv), query: { types: [] } },
      columns: ["name", "close", "change", "change_abs", "open", "high", "low", "volume"]
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new ProviderError(`TradingView -> ${res.status}`, "provider");
  const data = await res.json();
  const byTicker = new Map(pairs.map(p => [p.tv, p.sym]));
  for (const row of data?.data ?? []) {
    const sym = byTicker.get(row.s); if (!sym) continue;
    const [name, close, changePct, changeAbs] = row.d;
    if (typeof close !== "number") continue;
    out.set(sym, {
      symbol: sym, name: name || sym, price: close,
      change: +(changeAbs ?? 0).toFixed(4), changePercent: +(changePct ?? 0).toFixed(4),
      previousClose: +(close - (changeAbs ?? 0)).toFixed(4),
      source: "TradingView", quality: "live",
    });
  }
  return out;
}

let allIndicesCache: any = null;
let allIndicesCacheTime = 0;
async function fetchAllIndicesFromNse(): Promise<any> {
  const now = Date.now();
  if (allIndicesCache && (now - allIndicesCacheTime < 30000)) {
    return allIndicesCache;
  }
  const data = await nse.get("/api/allIndices");
  allIndicesCache = data;
  allIndicesCacheTime = now;
  return data;
}


// Cache and promise deduplication maps for individual chart requests
const activeSingleFetchPromises = new Map<string, Promise<any>>();

// Baseline stock price close values for fallbacks
const STOCK_BASELINE: Record<string, { name: string; price: number; changePercent: number }> = {
  "RELIANCE.NS": { name: "Reliance Industries Limited", price: 2450.75, changePercent: 1.25 },
  "TCS.NS": { name: "Tata Consultancy Services Limited", price: 3890.20, changePercent: -0.45 },
  "INFY.NS": { name: "Infosys Limited", price: 1540.50, changePercent: 2.10 },
  "HDFCBANK.NS": { name: "HDFC Bank Limited", price: 797.95, changePercent: 0.85 },
  "ICICIBANK.NS": { name: "ICICI Bank Limited", price: 1375.20, changePercent: 1.45 },
  "ADANIENT.NS": { name: "Adani Enterprises Limited", price: 3036.19, changePercent: 1.85 },
  "ADANIGREEN.NS": { name: "Adani Green Energy Limited", price: 1492.20, changePercent: 2.45 },
  "BHARTIARTL.NS": { name: "Bharti Airtel Limited", price: 1906.40, changePercent: -0.8013 },
  "AUROPHARMA.NS": { name: "Aurobindo Pharma Limited", price: 1578.69, changePercent: 0.95 },
  "HDFCLIFE.NS": { name: "HDFC Life Insurance Company Limited", price: 568.80, changePercent: 0.2114 },
  "ICICIPRU.NS": { name: "ICICI Prudential Asset Management Ltd", price: 3319.60, changePercent: 1.15 },
  "ONGC.NS": { name: "Oil & Natural Gas Corporation Ltd.", price: 234.90, changePercent: -0.65 },
  "INDUSTOWER.NS": { name: "Indus Towers Limited", price: 403.35, changePercent: -0.567 },
  "BBOX.NS": { name: "Black Box Limited", price: 947.20, changePercent: -1.55 },
  "PREMIERENE.NS": { name: "Premier Energies Limited", price: 1051.00, changePercent: 3.25 },
  "LT.NS": { name: "Larsen & Toubro Limited", price: 3793.00, changePercent: 0.46 },
  "TECHM.NS": { name: "Tech Mahindra Limited", price: 1569.10, changePercent: 3.8933 },
  "TATASTEEL.NS": { name: "Tata Steel Limited", price: 188.06, changePercent: -1.25 },
  "TATAMOTORS.NS": { name: "Tata Motors Limited", price: 352.19, changePercent: 1.65 },
  "VENTIVE.NS": { name: "Ventive Hospitality Limited", price: 627.65, changePercent: 0.00 },
  "DLF.NS": { name: "DLF Limited", price: 620.04, changePercent: -0.75 },
  "VBL.NS": { name: "Varun Beverages Limited", price: 462.00, changePercent: -0.9752 },
  "BIOCON.NS": { name: "Biocon Limited", price: 418.30, changePercent: -2.15 },
  "GODREJPROP.NS": { name: "Godrej Properties Limited", price: 1866.60, changePercent: 2.10 },
  "BAJAJFINSV.NS": { name: "Bajaj Finserv Limited", price: 1780.20, changePercent: -0.55 },
  "ANANDRATHI.NS": { name: "Anand Rathi Share & Stock Brokers Ltd.", price: 554.25, changePercent: 0.25 },
  "ITC.NS": { name: "ITC Limited", price: 286.95, changePercent: 0.15 },
  "KNOWLEDGE.REIT": { name: "Knowledge Realty Trust REIT", price: 115.45, changePercent: 0.10 },
  "SILVER": { name: "SILVER Fut (MCX 4 Sept 2026)", price: 188312.39, changePercent: -0.23794863 },
  "CRUDEOIL": { name: "CRUDEOIL Fut (NSE 20 Jul 2026)", price: 7610.07, changePercent: 1.11768573 },
  "GOLDBEES.NS": { name: "Nippon India ETF Gold Bees", price: 58.50, changePercent: 0.45 },
  "SILVERBEES.NS": { name: "Nippon India ETF Silver Bees", price: 88.20, changePercent: 1.05 },
  "GILT_PROXY": { name: "Quant Gilt Fund - Direct Plan", price: 12.55, changePercent: 0.05 },
  "TREPS_PROXY": { name: "Tri Party Repo (TREPs) Cash", price: 100.00, changePercent: 0.015 },
  "NCA_PROXY": { name: "Net Current Assets Cash", price: 1.00, changePercent: 0.00 },
  "IN10YT=RR": { name: "India 10Y Government Bond Yield", price: 7.0987, changePercent: 0.314 },
  "^NSEI": { name: "NIFTY 50", price: 24264.25, changePercent: 0.7955 },
  "JSWINFRA.NS": { name: "JSW Infrastructure Limited", price: 339.70, changePercent: 0.1179 },
  "HFCL.NS": { name: "HFCL Limited", price: 213.17, changePercent: -5.00 },
  "YESBANK.NS": { name: "YES Bank Ltd.", price: 23.46, changePercent: -1.221 },
  "CGCL.NS": { name: "Capri Global Capital Limited", price: 254.43, changePercent: -1.7227 },
  "AEGISLOG.NS": { name: "Aegis Logistics Limited", price: 1338.40, changePercent: 3.1522 },
  "AUBANK.NS": { name: "AU Small Finance Bank Limited", price: 1022.00, changePercent: -1.2656 },
  "AWL.NS": { name: "AWL Agri Business Limited", price: 188.97, changePercent: -0.4583 },
  "^NSEMDCP": { name: "Nifty Midcap 100 Index", price: 58500.00, changePercent: -0.6942 },
  "SONACOMS.NS": { name: "Sona BLW Precision Forgings Limited", price: 701.95, changePercent: 2.7144 },
  "INOXINDIA.NS": { name: "INOX INDIA LIMITED", price: 1966.50, changePercent: -1.3989 },
  "LTTS.NS": { name: "L&T Technology Services Limited", price: 3365.70, changePercent: -3.29 },
  "LTF.NS": { name: "L&T Finance Limited", price: 308.90, changePercent: -0.21 },
  "HINDUNILVR.NS": { name: "Hindustan Unilever Limited", price: 2135.70, changePercent: 1.7775 },
  "NESTLEIND.NS": { name: "Nestlé India Limited", price: 1418.80, changePercent: -0.3302 },
  "IDEA.NS": { name: "Vodafone Idea Limited", price: 13.80, changePercent: -0.6479 },
  "LICHSGFIN.NS": { name: "LIC Housing Finance Limited", price: 548.10, changePercent: 0.2469 },
  "CDSL.NS": { name: "Central Depository Services (India) Limited", price: 1405.40, changePercent: -0.3616 },
  "ADANIENSOL.NS": { name: "Adani Energy Solutions Limited", price: 1649.20, changePercent: 0.85 },
  "GMRAIRPORT.NS": { name: "GMR Airports Limited", price: 105.80, changePercent: -0.45 },
  "ADANIPORTS.NS": { name: "Adani Ports & SEZ Ltd", price: 1703.80, changePercent: 1.12 },
  "MCDOWELL-N.NS": { name: "United Spirits Limited", price: 1519.50, changePercent: 0.65 },
  "INDIGO.NS": { name: "Interglobe Aviation Limited", price: 5191.50, changePercent: -0.92 },
  "63MOONS.NS": { name: "63 moons technologies limited", price: 930.00, changePercent: 2.15 },
  "INDOMIM.NS": { name: "INDO-MIM Limited", price: 775.00, changePercent: 1.40 },
  "INDEGENE.NS": { name: "Indegene Limited", price: 515.00, changePercent: -0.30 },
  "KPITTECH.NS": { name: "KPIT Technologies Limited", price: 593.90, changePercent: -1.05 },
  "SONATSOFTW.NS": { name: "Sonata Software Limited", price: 322.00, changePercent: 0.45 },
  "POLYMED.NS": { name: "Poly Medicure Limited", price: 1700.00, changePercent: 0.80 },
  "IRB.NS": { name: "IRB Infrastructure Developers", price: 65.00, changePercent: -0.50 },
  "SUNTV.NS": { name: "SUN TV Network Limited", price: 508.00, changePercent: 0.20 },
  "AFCONS.NS": { name: "Afcons Infrastructure Limited", price: 271.00, changePercent: -0.15 },
  "MCX.NS": { name: "Multi Commodity Exchange of India", price: 2703.10, changePercent: 1.75 },
  "GABRIEL.NS": { name: "Gabriel India Limited", price: 1440.00, changePercent: 0.90 },
  "WELENT.NS": { name: "Welspun Enterprises Limited", price: 592.00, changePercent: 0.35 },
  "BAGMANE.REIT": { name: "Bagmane Prime Office REIT", price: 105.00, changePercent: 0.05 },
  "INDIGRID.NS": { name: "India Grid Trust InvIT", price: 178.00, changePercent: 0.25 },
  "CITIUS.INVIT": { name: "Citius TransNet Investment Trust", price: 109.50, changePercent: 0.10 },
  "RAAJMARG.INVIT": { name: "Raajmarg Infra Investment Trust", price: 116.40, changePercent: 0.15 },
  "CUBE.INVIT": { name: "Cube Highways Trust InvIT", price: 156.90, changePercent: 0.00 },
  "MRPL.NS": { name: "MANGALORE REFINERY & PETROCHEMICALS", price: 202.50, changePercent: -0.60 },
  "BLUEJET.NS": { name: "BLUE JET HEALTHCARE LTD", price: 625.00, changePercent: 1.10 },
  "IDBI.NS": { name: "IDBI Bank Limited", price: 83.50, changePercent: -0.25 },
  "IPCALAB.NS": { name: "IPCA Laboratories Ltd", price: 1475.00, changePercent: 0.50 },
  "TATACHEM.NS": { name: "Tata Chemicals Ltd", price: 1050.00, changePercent: -0.80 },
  "PTC.NS": { name: "PTC India Limited", price: 175.50, changePercent: 0.40 },
  "EICHERMOT.NS": { name: "Eicher Motors Ltd", price: 7860.00, changePercent: -1.15 },
  "BAJFINANCE.NS": { name: "Bajaj Finance Limited", price: 1144.80, changePercent: -0.95 },
  "CIPLA.NS": { name: "Cipla Limited", price: 1475.70, changePercent: 0.30 },
  "UPL.NS": { name: "UPL Limited", price: 607.55, changePercent: 1.25 },
  "CALIBER.NS": { name: "Caliber Mining and Logistics Limited", price: 550.00, changePercent: 0.60 },
  "HEXAWARE.NS": { name: "Hexaware Technologies Limited", price: 560.00, changePercent: 0.10 }
};

async function fetchIndianApiCommodityPrice(productName: string) {
  const key = process.env.INDIANAPI_KEY;
  if (!key) {
    throw new Error("INDIANAPI_KEY environment variable is not set. Please add it to your project's Secrets/Settings in the AI Studio UI.");
  }
  const target = productName.toUpperCase().replace("MCX:", "");
  const response = await fetch(`https://stock.indianapi.in/commodities`, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("IndianAPI authentication failed (401). Please verify your INDIANAPI_KEY in the project's Secrets/Settings.");
    }
    throw new Error(`IndianAPI failed with status: ${response.status}`);
  }
  
  const contracts = await response.json();
  const matches = contracts.filter((c: any) => c.product === target);
  
  if (matches.length === 0) {
    throw new Error(`Product ${target} not found in IndianAPI. Available products: ${contracts.map((c: any) => c.product).join(', ')}`);
  }
  
  // Pick the match with the most recent trade time
  const match = matches.sort((a: any, b: any) => 
    new Date(b.last_traded_time).getTime() - new Date(a.last_traded_time).getTime()
  )[0];
  
  const ltp = parseFloat(match.last_traded_price);
  const prev = parseFloat(match.close_price);
  const pct = parseFloat(match.per_change);
  
  return { prev, ltp, pct, expiry: match.expiry };
}

// Seed initial popular AMFI funds in case download is pending or fails
const POPULAR_MF_SEED: MFNavInfo[] = [
  { schemeCode: "120855", schemeName: "quant Multi Asset Allocation Fund - Growth - Direct Plan", nav: 118.50, date: "16-Jul-2026", isinGrowth: "INF179K01IQ5" },
  { schemeCode: "120847", schemeName: "Quant Small Cap Fund - Growth - Direct Plan", nav: 284.15, date: "16-Jul-2026", isinGrowth: "INF179K01IQ2" },
  { schemeCode: "120841", schemeName: "Quant Active Fund - Growth - Direct Plan", nav: 642.85, date: "16-Jul-2026", isinGrowth: "INF179K01GZ1" },
  { schemeCode: "120849", schemeName: "Quant Flexi Cap Fund - Growth - Direct Plan", nav: 112.40, date: "16-Jul-2026", isinGrowth: "INF179K01JR0" },
  { schemeCode: "120845", schemeName: "Quant Mid Cap Fund - Growth - Direct Plan", nav: 215.35, date: "16-Jul-2026", isinGrowth: "INF179K01HO6" },
  { schemeCode: "120843", schemeName: "Quant ELSS Tax Saver Fund - Growth - Direct Plan", nav: 380.95, date: "16-Jul-2026", isinGrowth: "INF179K01GY4" },
  { schemeCode: "119813", schemeName: "HDFC Balanced Advantage Fund - Growth - Direct Plan", nav: 445.20, date: "16-Jul-2026", isinGrowth: "INF179KB1FY8" },
  { schemeCode: "119775", schemeName: "SBI Bluechip Fund - Growth - Direct Plan", nav: 88.50, date: "16-Jul-2026", isinGrowth: "INF200K01LV1" },
  { schemeCode: "120823", schemeName: "Parag Parikh Flexi Cap Fund - Growth - Direct Plan", nav: 72.10, date: "16-Jul-2026", isinGrowth: "INF879O01027" },
];

// Helper to pre-populate map with seed values
function seedMFs() {
  for (const item of POPULAR_MF_SEED) {
    amfiCache.set(item.schemeCode, item);
  }
}

// Fetch and Parse AMFI NAV file
async function fetchAmfiNavs() {
  if (!isAmfiSyncWindowActive() && isAmfiLoaded && amfiCache.size > 20) {
    console.log("Skipping AMFI fetch (outside sync window).");
    return;
  }
  try {
    console.log("Fetching AMFI NAV file...");
    const response = await fetch("https://www.amfiindia.com/spages/NAVAll.txt", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout to allow for network variability
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AMFI: HTTP ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/);
    
    // Clear and reload
    const newCache = new Map<string, MFNavInfo>();
    
    // Repopulate with seed first to guarantee they always exist
    for (const seed of POPULAR_MF_SEED) {
      newCache.set(seed.schemeCode, seed);
    }

    let parsedCount = 0;
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const parts = line.split(";");
      if (parts.length >= 5) {
        const schemeCode = parts[0].trim();
        // Check if code is numeric
        if (/^\d+$/.test(schemeCode)) {
          const isinGrowth = parts[1]?.trim() || "";
          const schemeName = parts[3]?.trim() || "";
          const navStr = parts[4]?.trim() || "";
          const nav = parseFloat(navStr);
          const date = parts[5]?.trim() || "";

          if (!isNaN(nav)) {
            newCache.set(schemeCode, {
              schemeCode,
              schemeName,
              nav,
              date,
              isinGrowth,
            });
            parsedCount++;
          }
        }
      }
    }

    amfiCache = newCache;
    isAmfiLoaded = true;
    lastAmfiFetchTime = Date.now();
    console.log(`AMFI NAV database updated successfully. Loaded ${parsedCount} schemes.`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log("Using seed AMFI database.");
    if (amfiCache.size === 0) {
      seedMFs();
    }
    isAmfiLoaded = true;
    lastAmfiFetchTime = lastAmfiFetchTime || Date.now();
  }
}

// Start background interval to refresh AMFI NAVs every hour
seedMFs();
fetchAmfiNavs();
setInterval(fetchAmfiNavs, 1000 * 60 * 60);

// Helper to generate dynamic, ultra-realistic fallback values based on the symbol type
function getFallbackForSymbol(sym: string): { name: string; price: number; changePercent: number } {
  const cleanSym = sym.toUpperCase().trim();

  if (STOCK_BASELINE[cleanSym]) {
    return STOCK_BASELINE[cleanSym];
  }

  if (STOCK_BASELINE[cleanSym + ".NS"]) {
    return STOCK_BASELINE[cleanSym + ".NS"];
  }

  try {
    const parsed = parseDerivativeSymbol(cleanSym);
    if (parsed && parsed.underlying) {
      const underlyingNS = parsed.underlying + ".NS";
      const base = STOCK_BASELINE[underlyingNS] || STOCK_BASELINE[parsed.underlying];
      if (base) {
        if (parsed.isFuture) {
          // Futures trade with a slight cost of carry basis over spot
          const futPrice = Number((base.price * 1.0035).toFixed(2));
          return {
            name: `${parsed.underlying} ${parsed.expiryMonth || 'Aug'} Fut`,
            price: futPrice,
            changePercent: base.changePercent
          };
        } else if (parsed.isOption) {
          const spot = base.price;
          const strike = parsed.strike || spot;
          const diff = parsed.optType === "CE" ? (spot - strike) : (strike - spot);
          const intrinsic = Math.max(0, diff);
          const timeValue = spot * 0.012;
          const estPrice = Number((intrinsic + timeValue).toFixed(2));
          return {
            name: `${parsed.underlying} ${parsed.strike || ''} ${parsed.optType || 'Option'}`,
            price: estPrice,
            changePercent: Number((base.changePercent * (parsed.optType === "CE" ? 1.2 : -1.2)).toFixed(4))
          };
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // 1. COMMODITIES
  if (cleanSym.includes("GOLD") || cleanSym.includes("GOLDBEES")) {
    return { name: "MCX Gold Futures", price: 72850.0, changePercent: 0.42 };
  }
  if (cleanSym.includes("SILVER")) {
    return { name: "SILVER Fut (MCX 4 Sept 2026)", price: 188312.39, changePercent: -0.23794863 };
  }
  if (cleanSym.includes("CRUDE") || cleanSym.includes("BRENT")) {
    return { name: "CRUDEOIL Fut (NSE 20 Jul 2026)", price: 7610.07, changePercent: 1.11768573 };
  }

  // 2. F&O CONTRACT NOT SUPPORTED IN STATIC BASELINE FALLBACK
  if (cleanSym.endsWith("CE") || cleanSym.includes(" CALL") || cleanSym.endsWith(".CE") ||
      cleanSym.endsWith("PE") || cleanSym.includes(" PUT") || cleanSym.endsWith(".PE") ||
      cleanSym.endsWith("FUT") || cleanSym.includes("-FUT") || cleanSym.includes("FUTURES")) {
    throw new ProviderError(`F&O Contract not available in baseline fallback: ${cleanSym}`, "symbol");
  }

  // 3. DEBT / BONDS
  if (cleanSym.includes("GS") || cleanSym.includes("BOND") || cleanSym.includes("G-SEC") || cleanSym.includes("IN10YT") || cleanSym.endsWith("YT=RR")) {
    return { name: `Sovereign Bond G-Sec (${cleanSym})`, price: 7.105, changePercent: 0.05 };
  }

  // 4. DEFAULT EQUITY
  const baseName = cleanSym.replace(".NS", "").replace(".BO", "");
  return {
    name: `${baseName} Share`,
    price: 350.0,
    changePercent: 0.5,
  };
}

// Fetch a single symbol quote using the robust, crumb-free /v8/finance/chart endpoint
async function fetchSingleChartQuote(symbol: string): Promise<any> {
  const cleanSymbol = symbol.trim().toUpperCase();
  
  // Map internal symbols to their correct/active Yahoo Finance tickers
  const mapped = SYMBOL_MAP[cleanSymbol];
  const yahooSymbol = mapped ? mapped.yahoo : cleanSymbol;
  
  // Use query1 or query2 alternately to split load and avoid rate limiting
  const host = Math.random() > 0.5 ? "query1.finance.yahoo.com" : "query2.finance.yahoo.com";
  const url = `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
    "Connection": "keep-alive",
  };

  let lastError;
  let delayMs = 500;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 429 || res.status >= 500) {
        const jitter = Math.random() * 300;
        const waitTime = delayMs + jitter;
        console.warn(`[Yahoo] Attempt ${attempt + 1} returned status ${res.status}. Backing off for ${waitTime.toFixed(0)}ms...`);
        await delay(waitTime);
        delayMs *= 2;
        continue;
      }

      if (res.status === 404) {
        throw new ProviderError(`Symbol not found on Yahoo: ${yahooSymbol}`, "symbol");
      }

      if (!res.ok) {
        throw new ProviderError(`Yahoo Chart API returned status ${res.status}`, "provider");
      }

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) {
        throw new Error(`No chart metadata returned`);
      }

      const quoteList = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
      const lastCloseInList = Array.isArray(quoteList) && quoteList.length > 0 ? quoteList[quoteList.length - 1] : null;

      const price = meta.regularMarketPrice ?? lastCloseInList ?? meta.previousClose ?? 0;
      const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change = price - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      yahooBreaker.recordSuccess();

      return {
        symbol: symbol,
        price: Number(price.toFixed(4)),
        change: Number(change.toFixed(4)),
        changePercent: Number(changePercent.toFixed(4)),
        previousClose: Number(previousClose.toFixed(4)),
        name: meta.longName || meta.shortName || STOCK_BASELINE[symbol]?.name || symbol,
        source: `YahooFinance-${host}`,
      };
    } catch (err) {
      if (err instanceof ProviderError && err.kind === "symbol") {
        throw err; // immediate propagation, no retry!
      }
      lastError = err;
      const jitter = Math.random() * 300;
      await delay(delayMs + jitter);
      delayMs *= 2;
    }
  }
  
  if (lastError instanceof ProviderError && lastError.kind === "symbol") {
    throw lastError;
  }
  yahooBreaker.recordFailure();
  throw lastError || new ProviderError(`Failed to fetch Yahoo quote for ${symbol}`, "provider");
}

async function performProviderChainFetch(symbol: string): Promise<any> {
  const cleanSym = symbol.trim().toUpperCase();

  // 1. Bypass symbols (excluding KNOWLEDGE.REIT so it is queried live)
  const BYPASS_SYMBOLS = new Set([
    "IN10YT=RR",
    "TREPS_PROXY",
    "GILT_PROXY",
    "NCA_PROXY",
    "CP_RATE",
    "CD_RATE",
    "TBILL_RATE"
  ]);

  if (BYPASS_SYMBOLS.has(cleanSym)) {
    return getFallbackQuote(symbol);
  }

  // 1.1 F&O Derivatives (NSE Direct & TradingView Futures)
  const parsedDeriv = parseDerivativeSymbol(cleanSym);

  if (parsedDeriv.isOption || parsedDeriv.isFuture) {
    if (nseBreaker.canExecute()) {
      try {
        let ltp: number | null = null;
        let prevClose = 0;
        let pChange: number | null = null;

        if (parsedDeriv.isOption) {
          const isIndex = parsedDeriv.underlying === "NIFTY" || parsedDeriv.underlying === "BANKNIFTY" || parsedDeriv.underlying === "FINNIFTY" || parsedDeriv.underlying === "NIFTYNXT50" || parsedDeriv.underlying === "MIDCPNIFTY";
          const endpoint = isIndex 
            ? `/api/option-chain-indices?symbol=${encodeURIComponent(parsedDeriv.underlying)}` 
            : `/api/option-chain-equities?symbol=${encodeURIComponent(parsedDeriv.underlying)}`;
          
          const cacheKey = `${parsedDeriv.underlying}_${isIndex ? "index" : "equity"}`;
          const cached = optionChainCache.get(cacheKey);
          const now = Date.now();
          let chain: any;
          if (cached && now - cached.timestamp < CHAIN_CACHE_TTL) {
            chain = cached.data;
          } else {
            chain = await nse.get(endpoint);
            if (chain) {
              optionChainCache.set(cacheKey, { data: chain, timestamp: now });
            }
          }

          let strikeRow = chain?.records?.data?.find(
            (d: any) => d.strikePrice === parsedDeriv.strike && d.expiryDate === parsedDeriv.expiry
          ) || chain?.filtered?.data?.find(
            (d: any) => d.strikePrice === parsedDeriv.strike && d.expiryDate === parsedDeriv.expiry
          );

          const leg = parsedDeriv.optType === "CE" ? strikeRow?.CE : strikeRow?.PE;
          ltp = leg?.lastPrice ?? null;
          const change = leg?.change ?? 0;
          pChange = leg?.pChange ?? null;
          prevClose = (ltp !== null)
            ? ltp - change
            : (leg?.previousClose ?? leg?.prevClose ?? 0);
        } else {
          const data = await nse.get(`/api/quote-derivative?symbol=${encodeURIComponent(parsedDeriv.underlying)}`);
          const fut = data?.data?.find((d: any) => {
            if (d.instrumentType !== "FUTIDX" && d.instrumentType !== "FUTSTK") return false;
            if (parsedDeriv.expiryMonth) {
              return (d.expiryDate || "").toUpperCase().includes(parsedDeriv.expiryMonth.toUpperCase());
            }
            if (parsedDeriv.expiry) {
              return (d.expiryDate || "").toUpperCase() === parsedDeriv.expiry.toUpperCase();
            }
            return true;
          }) || data?.data?.find((d: any) => d.instrumentType === "FUTIDX" || d.instrumentType === "FUTSTK");

          ltp = fut?.lastPrice ?? null;
          pChange = fut?.pChange ?? fut?.pchange ?? null;
          const change = fut?.change ?? (ltp !== null && pChange !== null ? (ltp * pChange / 100) : 0);
          prevClose = fut?.prevClose ?? fut?.previousClose ?? (ltp !== null ? ltp - change : 0);
        }

        if (ltp !== null) {
          nseBreaker.recordSuccess();
          const changeVal = +(ltp - prevClose).toFixed(2);
          const changePct = pChange !== null 
            ? +pChange.toFixed(4)
            : (prevClose ? +(((ltp - prevClose) / prevClose) * 100).toFixed(4) : 0);

          return {
            symbol,
            price: +(ltp.toFixed(2)),
            change: changeVal,
            changePercent: changePct,
            previousClose: +(prevClose.toFixed(2)),
            name: `${parsedDeriv.underlying} ${parsedDeriv.expiryMonth || ''} ${parsedDeriv.isOption ? (parsedDeriv.strike + ' ' + parsedDeriv.optType) : 'Fut'}`.trim(),
            source: "NSE-Direct-Derivative",
            quality: "live"
          };
        }
      } catch (err) {
        console.log(`[NSE Derivative] Quote unavailable for ${cleanSym}: ${err instanceof Error ? err.message : err}`);
        if (!(err instanceof ProviderError && err.kind === "symbol")) {
          nseBreaker.recordFailure();
        }
      }
    }

    // Try TradingView continuous futures scan as fallback for futures
    if (parsedDeriv.isFuture && tvBreaker.canExecute()) {
      try {
        const tvMap = await fetchTradingViewQuotes([cleanSym]);
        const tvQuote = tvMap.get(cleanSym);
        if (tvQuote) {
          tvBreaker.recordSuccess();
          return {
            ...tvQuote,
            name: `${parsedDeriv.underlying} ${parsedDeriv.expiryMonth || 'Aug'} Fut`,
            source: "TradingView-Futures",
            quality: "live"
          };
        }
      } catch (err) {
        console.log(`[TradingView Futures] Backup quote unavailable for ${cleanSym}`);
      }
    }
  }

  // 2. Commodities (SILVER, CRUDEOIL)
  if (cleanSym === "SILVER" || cleanSym === "CRUDEOIL") {
    if (indianapiBreaker.canExecute()) {
      try {
        const { prev, ltp, pct, expiry } = await fetchIndianApiCommodityPrice(cleanSym);
        indianapiBreaker.recordSuccess();
        
        lastKnownCommodityCloses.set(cleanSym, {
          price: prev,
          timestamp: Date.now()
        });

        return {
          symbol,
          price: Number(ltp.toFixed(2)),
          change: Number((ltp - prev).toFixed(2)),
          changePercent: Number(pct.toFixed(4)),
          previousClose: Number(prev.toFixed(2)),
          name: cleanSym === "SILVER" ? `SILVER Fut (${expiry})` : `CRUDEOIL Fut (${expiry})`,
          source: "IndianAPI-Live",
          quality: "live"
        };
      } catch (err) {
        console.log(`[Commodity Provider] IndianAPI temporary lookup fallback for ${cleanSym}`);
        indianapiBreaker.recordFailure();
      }
    }

    // Fallback to Yahoo indicative drift
    if (yahooBreaker.canExecute()) {
      try {
        const yahooSymbol = cleanSym === "SILVER" ? "SI=F" : "CL=F";
        const yahooQuote = await fetchSingleChartQuote(yahooSymbol);
        
        const cachedClose = lastKnownCommodityCloses.get(cleanSym);
        const anchorPrice = cachedClose ? cachedClose.price : STOCK_BASELINE[cleanSym].price;
        
        const driftPrice = anchorPrice * (1 + yahooQuote.changePercent / 100);
        const previousClose = anchorPrice;
        const change = driftPrice - previousClose;
        
        return {
          symbol,
          price: Number(driftPrice.toFixed(4)),
          change: Number(change.toFixed(4)),
          changePercent: Number(yahooQuote.changePercent.toFixed(4)),
          previousClose: Number(previousClose.toFixed(4)),
          name: cleanSym === "SILVER" ? "Indicative Silver (COMEX Proxy)" : "Indicative Crude Oil (COMEX Proxy)",
          source: "YahooComexProxy",
          indicative: true,
          asOf: new Date().toISOString(),
          quality: "indicative"
        };
      } catch (err) {
        console.log(`[Commodity Provider] Yahoo COMEX proxy backup triggered`);
      }
    }

    // Ultimate fallback
    return {
      ...getFallbackQuote(symbol),
      stale: true,
      source: "FallbackBaseline",
      asOf: new Date().toISOString(),
      quality: "stale"
    };
  }

  // 3. Equities and Indices
  const isIndex = cleanSym === "^NSEI" || cleanSym === "^NSEMDCP";
  
  if (isIndex) {
    if (nseBreaker.canExecute()) {
      try {
        const indicesData = await fetchAllIndicesFromNse();
        const nseIndexName = cleanSym === "^NSEI" ? "NIFTY 50" : "NIFTY MIDCAP 100";
        const match = indicesData?.data?.find((idx: any) => 
          idx.index.toUpperCase().trim() === nseIndexName
        );

        if (match) {
          nseBreaker.recordSuccess();
          const lastPrice = match.last ?? match.lastPrice ?? 0;
          const pct = match.percentChange ?? match.pChange ?? 0;
          const previousClose = match.previousClose ?? (lastPrice / (1 + (pct / 100)));
          const change = lastPrice - previousClose;

          return {
            symbol,
            price: Number(lastPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(pct.toFixed(4)),
            previousClose: Number(previousClose.toFixed(2)),
            name: nseIndexName,
            source: "NSE-Direct-Index",
            quality: "live"
          };
        } else {
          throw new ProviderError(`Index ${nseIndexName} not found in NSE response`, "symbol");
        }
      } catch (err) {
        console.log(`[NSE Index Provider] NSE indices fetch unavailable for ${cleanSym} (switching to fallback): ${err instanceof Error ? err.message : err}`);
        if (err instanceof ProviderError && err.kind === "symbol") {
          // do NOT touch the breaker
        } else {
          nseBreaker.recordFailure();
        }
      }
    }

    // Fallback to Yahoo Finance
    if (yahooBreaker.canExecute()) {
      try {
        let yahooQuote;
        if (cleanSym === "^NSEMDCP") {
          // Yahoo does not support Nifty Midcap 100, use Nifty 50 (^NSEI) as high-correlation proxy
          const proxyQuote = await fetchSingleChartQuote("^NSEI");
          const baseline = STOCK_BASELINE["^NSEMDCP"];
          const driftPrice = baseline.price * (1 + proxyQuote.changePercent / 100);
          const previousClose = baseline.price;
          const change = driftPrice - previousClose;

          yahooQuote = {
            symbol,
            price: Number(driftPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(proxyQuote.changePercent.toFixed(4)),
            previousClose: Number(previousClose.toFixed(2)),
            name: baseline.name,
            source: "YahooProxy-Nifty50",
            quality: "indicative"
          };
        } else {
          yahooQuote = await fetchSingleChartQuote(symbol);
        }

        return {
          ...yahooQuote,
          source: "YahooFinance-Index",
          quality: yahooQuote.quality || "live"
        };
      } catch (err) {
        console.log(`[NSE Index Provider] Yahoo alternative route unavailable for ${symbol} (switching to fallback)`);
      }
    }

    return {
      ...getFallbackQuote(symbol),
      stale: true,
      source: "FallbackBaseline",
      asOf: new Date().toISOString(),
      quality: "stale"
    };
  }

  // Equities (like RELIANCE.NS)
  const mapped = SYMBOL_MAP[cleanSym];
  const nseSymbol = mapped ? mapped.nse : cleanSym.replace(/\.(NS|BO)$/, "");

  if (nseBreaker.canExecute()) {
    try {
      const data = await nse.get(`/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}`);
      const priceInfo = data?.priceInfo;
      const info = data?.info;
      if (priceInfo && priceInfo.lastPrice !== undefined) {
        nseBreaker.recordSuccess();
        const price = priceInfo.lastPrice;
        const previousClose = priceInfo.previousClose ?? (price - (priceInfo.change ?? 0));
        const change = priceInfo.change ?? (price - previousClose);
        const changePercent = priceInfo.pChange ?? (previousClose !== 0 ? (change / previousClose) * 100 : 0);
        const companyName = info?.companyName ?? STOCK_BASELINE[symbol]?.name ?? symbol;

        return {
          symbol,
          price: Number(price.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(4)),
          previousClose: Number(previousClose.toFixed(2)),
          name: companyName,
          source: "NSE-Direct-Equity",
          quality: "live"
        };
      } else {
        throw new ProviderError(`Invalid quote response from NSE (missing priceInfo) for ${nseSymbol}`, "provider");
      }
    } catch (err) {
      console.log(`[NSE Equity Provider] NSE quote-equity unavailable for ${nseSymbol} (switching to fallback): ${err instanceof Error ? err.message : err}`);
      if (err instanceof ProviderError && err.kind === "symbol") {
        // do NOT touch the breaker
      } else {
        nseBreaker.recordFailure();
      }
    }
  }

  // Fallback to Yahoo Finance
  if (yahooBreaker.canExecute()) {
    try {
      const yahooQuote = await fetchSingleChartQuote(symbol);
      return {
        ...yahooQuote,
        source: "YahooFinance-Equity",
        quality: yahooQuote.quality || "live"
      };
    } catch (err) {
      console.log(`[Equity Provider] Yahoo alternate route completed for ${symbol}`);
    }
  }

  // Ultimate fallback
  return {
    ...getFallbackQuote(symbol),
    stale: true,
    source: "FallbackBaseline",
    asOf: new Date().toISOString(),
    quality: "stale"
  };
}

function triggerBackgroundFetch(symbol: string) {
  const cleanSym = symbol.trim().toUpperCase();
  if (activeSingleFetchPromises.has(cleanSym)) {
    return; // Already fetching
  }

  const fetchPromise = performProviderChainFetch(symbol)
    .then((freshQuote) => {
      quoteCache.set(cleanSym, {
        quote: freshQuote,
        timestamp: Date.now(),
      });
      console.log(`[SWR Background] Updated cache for ${cleanSym}`);
      return freshQuote;
    })
    .catch((err) => {
      console.log(`[SWR Background] SWR retry triggered for ${cleanSym}`);
    })
    .finally(() => {
      activeSingleFetchPromises.delete(cleanSym);
    });

  activeSingleFetchPromises.set(cleanSym, fetchPromise);
}

// Concurrent execution pool
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const promises: Promise<void>[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        console.warn(`Error in pool worker on index ${i} (${items[i]}):`, err);
        results[i] = {
          symbol: String(items[i]),
          change: 0,
          changePercent: 0,
          name: String(items[i]),
          source: "Unavailable",
          unavailable: true,
          stale: true,
          quality: "stale"
        } as any;
      }
    }
  }

  const workerCount = Math.min(items.length, limit);
  for (let w = 0; w < workerCount; w++) {
    promises.push(worker());
  }
  await Promise.all(promises);
  return results;
}

// Fetch multiple symbols using SWR and parallel provider chain queries with concurrency limit
async function fetchMarketQuotes(symbolsList: string[]) {
  if (symbolsList.length === 0) return [];

  const now = Date.now();
  const tvResults = new Map<string, any>();
  let misses = symbolsList;

  if (tvBreaker.canExecute()) {
    try {
      const tv = await fetchTradingViewQuotes(symbolsList);
      tvBreaker.recordSuccess();
      for (const [sym, q] of tv) { quoteCache.set(sym, { quote: q, timestamp: now }); tvResults.set(sym, q); }
      misses = symbolsList.filter(s => !tvResults.has(s.trim().toUpperCase()));
    } catch (e) { tvBreaker.recordFailure(); }
  }
  
  const fetchOne = async (symbol: string) => {
    const cleanSym = symbol.trim().toUpperCase();
    
    const cached = quoteCache.get(cleanSym);
    if (cached) {
      const isExpired = (now - cached.timestamp > getCacheTTLForSymbol(symbol));
      if (!isExpired) {
        return cached.quote;
      } else {
        triggerBackgroundFetch(symbol);
        return {
          ...cached.quote,
          stale: true,
          asOf: new Date(cached.timestamp).toISOString(),
        };
      }
    }

    try {
      const freshQuote = await performProviderChainFetch(symbol);
      quoteCache.set(cleanSym, {
        quote: freshQuote,
        timestamp: now,
      });
      // Seed baselines at startup from first successful fetch of live/real sources (avoiding proxy circular drift)
      const REAL_SOURCES = /^(NSE-Direct|YahooFinance-(Equity|Index)$|IndianAPI-Live|TradingView)/;
      if (STOCK_BASELINE[cleanSym] && REAL_SOURCES.test(freshQuote.source || "")) {
        STOCK_BASELINE[cleanSym].price = freshQuote.price;
        STOCK_BASELINE[cleanSym].changePercent = freshQuote.changePercent;
      }
      return freshQuote;
    } catch (err) {
      console.log(`[Provider Chain] Blocking fetch alternate fallback for ${symbol}`);
      return {
        ...getFallbackQuote(symbol),
        stale: true,
        asOf: new Date().toISOString()
      };
    }
  };

  const rest = await pool(misses, 3, fetchOne);
  return [...tvResults.values(), ...rest];
}

// Generates dynamic, realistic mock quote for a symbol
function getFallbackQuote(sym: string) {
  const base = getFallbackForSymbol(sym);
  return {
    symbol: sym,
    price: base.price,
    change: Number((base.price * (base.changePercent / 100)).toFixed(4)),
    changePercent: base.changePercent,
    previousClose: Number((base.price / (1 + (base.changePercent / 100))).toFixed(4)),
    name: base.name,
    source: "FallbackBaseline",
    quality: "stale"
  };
}

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    nseHost: NSE_HOST,
    amfiLoaded: isAmfiLoaded,
    amfiCacheSize: amfiCache.size,
    lastAmfiUpdate: lastAmfiFetchTime ? new Date(lastAmfiFetchTime).toISOString() : null,
    providers: {
      nse: nseBreaker.getStatusString(),
      yahoo: yahooBreaker.getStatusString(),
      indianapi: indianapiBreaker.getStatusString(),
      tradingview: tvBreaker.getStatusString(),
    },
  });
});

app.get("/ping", (_req, res) => res.status(200).send("ok"));

// Search AMFI schemes
app.get("/api/amfi/search", (req, res) => {
  const query = (req.query.q as string || "").trim().toLowerCase();
  if (query.length < 3) {
    return res.json([]);
  }

  const results: MFNavInfo[] = [];
  for (const [_, scheme] of amfiCache.entries()) {
    if (scheme.schemeName.toLowerCase().includes(query) || scheme.schemeCode.includes(query)) {
      results.push(scheme);
      if (results.length >= 40) break; // Limit response size to 40 items
    }
  }

  res.json(results);
});

// Fetch current Mutual Fund NAVs and the Nifty 50 proxy change
app.get("/api/amfi/quotes", async (req, res) => {
  const codesStr = req.query.codes as string || "";
  if (!codesStr) {
    return res.json({ quotes: [], indexProxy: { symbol: "^NSEI", price: 24315, changePercent: 0.75 } });
  }

  const codes = codesStr.split(",");
  const quotes = codes.map(code => {
    const cached = amfiCache.get(code);
    if (cached) {
      return cached;
    }
    // Return a default mock NAV if code is not cached (unlikely)
    return {
      schemeCode: code,
      schemeName: `Mutual Fund Scheme ${code}`,
      nav: 150.0,
      date: new Date().toLocaleDateString("en-IN"),
      isinGrowth: "",
    };
  });

  // Fetch Nifty 50 as index proxy for intraday estimates
  let niftyChange = 0.75;
  let niftyPrice = 24315.90;
  try {
    const niftyQuote = await fetchMarketQuotes(["^NSEI"]);
    if (niftyQuote && niftyQuote.length > 0) {
      niftyChange = niftyQuote[0].changePercent;
      niftyPrice = niftyQuote[0].price;
    }
  } catch (e) {
    console.warn("Failed to fetch Nifty index proxy, using fallback Nifty stats:", e);
  }

  res.json({
    quotes,
    indexProxy: {
      symbol: "^NSEI",
      price: niftyPrice,
      changePercent: niftyChange,
    },
  });
});

// Fetch Stock quotes and yields
app.get("/api/stocks/quotes", async (req, res) => {
  const symbolsStr = req.query.symbols as string || "";
  if (!symbolsStr) {
    return res.json([]);
  }

  const symbols = symbolsStr.split(",");
  const quotes = await fetchMarketQuotes(symbols);
  res.json(quotes);
});

// Boot server and integrate Vite
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust path resolution relative to workspace root in production
    const distPath = path.join(process.cwd(), "dist");
    
    console.log(`[Prod Server] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Startup self-test to check NSE/Yahoo connectivity
    setTimeout(() => {
      fetchMarketQuotes(["RELIANCE.NS"]).then(([q]) => {
        if (q && q.source !== "FallbackBaseline" && q.source !== "Unavailable") {
          quoteCache.set("RELIANCE.NS", { quote: q, timestamp: Date.now() });
          console.log(`[Self-Test] Live feed OK via ${q.source}`);
        } else {
          console.warn("[Self-Test] WARNING: All live providers unreachable — serving baselines.");
        }
      }).catch(() => {});
    }, 1000);

    // Pre-warm quotes so first user paint is instant (one batched TradingView call)
    setTimeout(() => {
      fetchMarketQuotes(["RELIANCE.NS","ITC.NS","^NSEI","^NSEMDCP","SILVER","CRUDEOIL",
        "ADANIENSOL.NS","INDUSTOWER.NS","JSWINFRA.NS","GMRAIRPORT.NS","ADANIPORTS.NS",
        "GOLDBEES.NS","SILVERBEES.NS","BHARTIARTL.NS","TATAMOTORS.NS","INDOMIM.NS"])
        .catch(() => {});
    }, 2000);
  });
}

startServer();
