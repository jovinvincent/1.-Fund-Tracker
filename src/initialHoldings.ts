import { Holding } from "./types";
import { QUANT_PORTFOLIO_HOLDINGS } from "./quantPortfolioData";

// Base prices from 31 July 2026 statement baseline mapping
const BASELINE_PRICES: Record<string, number> = {
  "ICICIBANK.NS": 1375.20,
  "ADANIENT.NS": 3036.19,
  "ADANIGREEN.NS": 1492.20,
  "BHARTIARTL.NS": 1852.00,
  "AUROPHARMA.NS": 1578.69,
  "HDFCLIFE.NS": 575.85,
  "ICICIPRU.NS": 3319.60,
  "ONGC.NS": 234.90,
  "HDFCBANK.NS": 797.95,
  "INDUSTOWER.NS": 391.70,
  "BBOX.NS": 947.20,
  "PREMIERENE.NS": 1051.00,
  "LT.NS": 4143.40,
  "TECHM.NS": 1404.70,
  "TATASTEEL.NS": 188.06,
  "TATAMOTORS.NS": 352.19,
  "VENTIVE.NS": 627.65,
  "DLF.NS": 620.04,
  "VBL.NS": 507.55,
  "BIOCON.NS": 418.30,
  "GODREJPROP.NS": 1866.60,
  "BAJAJFINSV.NS": 1780.20,
  "ANANDRATHI.NS": 554.25,
  "ITC.NS": 286.95,
  "KNOWLEDGE.REIT": 115.45,
  "SILVER": 188312.39,
  "CRUDEOIL": 7610.07,
  "IN10YT=RR": 6.58, // sovereign yield proxy
  "CP_RATE": 100.0,
  "CD_RATE": 100.0,
  "TBILL_RATE": 100.0,
  "GOLDBEES.NS": 58.50,
  "SILVERBEES.NS": 88.20,
  "GILT_PROXY": 12.55,
  "TREPS_PROXY": 100.00,
  "NCA_PROXY": 1.00,
  "JSWINFRA.NS": 315.50,
  "HFCL.NS": 121.25,
  "YESBANK.NS": 24.80,
  "CGCL.NS": 215.30,
  "AEGISLOG.NS": 820.50,
  "AUBANK.NS": 625.40,
  "AWL.NS": 365.10,
  "^NSEMDCP": 15200.00,
  "SONACOMS.NS": 685.20,
  "INOXINDIA.NS": 1150.30,
  "LTTS.NS": 4820.00,
  "LTF.NS": 172.50,
  "HINDUNILVR.NS": 2530.00,
  "NESTLEIND.NS": 2490.00,
  "IDEA.NS": 13.07,
  "LICHSGFIN.NS": 712.40,
  "CDSL.NS": 2080.00,
  "ADANIENSOL.NS": 1649.20,
  "GMRAIRPORT.NS": 105.80,
  "ADANIPORTS.NS": 1703.80,
  "MCDOWELL-N.NS": 1519.50,
  "INDIGO.NS": 5191.50,
  "63MOONS.NS": 930.00,
  "INDOMIM.NS": 775.00,
  "INDEGENE.NS": 515.00,
  "KPITTECH.NS": 593.90,
  "SONATSOFTW.NS": 322.00,
  "POLYMED.NS": 1700.00,
  "IRB.NS": 65.00,
  "SUNTV.NS": 508.00,
  "AFCONS.NS": 271.00,
  "MCX.NS": 2703.10,
  "GABRIEL.NS": 1440.00,
  "WELENT.NS": 592.00,
  "BAGMANE.REIT": 105.00,
  "INDIGRID.NS": 178.00,
  "CITIUS.INVIT": 109.50,
  "RAAJMARG.INVIT": 116.40,
  "CUBE.INVIT": 156.90,
  "MRPL.NS": 202.50,
  "BLUEJET.NS": 625.00,
  "RELIANCE.NS": 1323.10,
  "IDBI.NS": 83.50,
  "IPCALAB.NS": 1475.00,
  "TATACHEM.NS": 1050.00,
  "PTC.NS": 175.50,
  "EICHERMOT.NS": 7860.00,
  "BAJFINANCE.NS": 1144.80,
  "CIPLA.NS": 1475.70,
  "UPL.NS": 607.55,
  "CALIBER.NS": 550.00,
  "HEXAWARE.NS": 560.00
};

/**
 * Returns scaled holdings from raw holding definitions.
 */
export function getScaledHoldings(investmentAmount: number = 100000): Holding[] {
  return QUANT_PORTFOLIO_HOLDINGS.map((h) => {
    const allocatedValue = investmentAmount * (h.weight / 100);
    const basePrice = BASELINE_PRICES[h.symbol] || BASELINE_PRICES[h.isin] || 100.0;
    const absAllocated = Math.abs(allocatedValue);
    const quantity = absAllocated / basePrice;

    return {
      id: `quant-${h.type}-${h.sr}`,
      name: h.name,
      symbol: h.symbol,
      type: h.type,
      quantity: Number(quantity.toFixed(6)),
      avgPrice: basePrice,
      position: h.position,
      isin: h.isin,
      rating: h.rating,
      industry: h.industry,
      weight: h.weight,
      ytm: h.ytm,
      marketValueLakhs: h.marketValueLakhs,
      subCategory: h.industry !== "N.A." ? h.industry : undefined
    };
  });
}

export function getScaledHoldingsGeneric(
  holdings: { name: string; symbol: string; weight: number; type: any; industry?: string; position?: "long" | "short" }[],
  investmentAmount: number = 100000,
  prefix: string = "qsif"
): Holding[] {
  return holdings.map((h, idx) => {
    const allocatedValue = investmentAmount * (h.weight / 100);
    const basePrice = BASELINE_PRICES[h.symbol] || 100.0;
    const absAllocated = Math.abs(allocatedValue);
    const quantity = absAllocated / basePrice;
    const position = h.position || (h.weight < 0 ? "short" : "long");

    return {
      id: `${prefix}-${h.symbol}-${idx}`,
      name: h.name,
      symbol: h.symbol,
      type: h.type,
      quantity: Number(quantity.toFixed(6)),
      avgPrice: basePrice,
      position: position,
      isin: h.symbol,
      rating: "N.A.",
      industry: h.industry || "General",
      weight: h.weight,
      ytm: null,
      marketValueLakhs: Number((allocatedValue / 100000).toFixed(4)),
      subCategory: h.industry
    };
  });
}

export const INITIAL_HOLDINGS: Holding[] = getScaledHoldings(100000);
