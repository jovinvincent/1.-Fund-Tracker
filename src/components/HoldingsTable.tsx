import { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Scale, 
  Layers, 
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { HoldingWithLiveStats, AssetType } from "../types";
import { formatINR } from "./SummaryCards";

interface HoldingsTableProps {
  holdings: HoldingWithLiveStats[];
  onUpdateHolding: (id: string, quantity: number, avgPrice: number) => void;
  onDeleteHolding: (id: string) => void;
  initialCategory?: AssetType | "all" | "hedged";
  initialSubFilter?: "all" | "neutral" | "partial" | "over" | "naked_short";
}

export interface HedgedGroupData {
  underlyingKey: string;
  underlyingName: string;
  industry: string;
  symbol: string;
  holdings: HoldingWithLiveStats[];
  longHolding?: HoldingWithLiveStats;
  shortHolding?: HoldingWithLiveStats;
  
  longInvested: number;
  longCurrentValue: number;
  longQty: number;
  
  shortInvested: number;
  shortCurrentValue: number;
  shortAbsValue: number;
  shortQty: number;
  
  netInvestedValue: number;
  netCurrentValue: number;
  
  combinedDailyChangeAmount: number;
  combinedDailyChangePercent: number;
  
  combinedTotalGainLossAmount: number;
  combinedTotalGainLossPercent: number;
  
  hedgeRatioPercent: number;
  status: "neutral" | "partial" | "over" | "naked_short";
}

export function getUnderlyingSymbol(h: HoldingWithLiveStats): string {
  const sym = (h.symbol || "").trim().toUpperCase();
  const name = (h.name || "").trim().toUpperCase();

  let cleanSym = sym.replace(/\.(NS|BO|REIT)$/i, "").replace(/[^A-Z0-9]/g, "");

  if (cleanSym.includes("ADANIENSOL") || name.includes("ADANI ENERGY")) return "ADANIENSOL";
  if (cleanSym.includes("BAJAJFINSV") || name.includes("BAJAJ FINSERV")) return "BAJAJFINSV";
  if (cleanSym.includes("BIOCON") || name.includes("BIOCON")) return "BIOCON";
  if (cleanSym.includes("GODREJPROP") || name.includes("GODREJ PROP")) return "GODREJPROP";
  if (cleanSym.includes("ITC") || name.includes("ITC LIMITED") || name.includes("ITC LTD")) return "ITC";
  if (cleanSym.includes("VBL") || name.includes("VARUN BEVERAGES")) return "VBL";
  if (cleanSym.includes("DLF") || name.includes("DLF LIMITED") || name.includes("DLF LTD")) return "DLF";
  if (cleanSym.includes("TATAMOTORS") || name.includes("TATA MOTORS") || cleanSym.includes("TMPV")) return "TATAMOTORS";
  if (cleanSym.includes("TATASTEEL") || name.includes("TATA STEEL")) return "TATASTEEL";
  if ((cleanSym === "LT" || cleanSym.startsWith("LT28")) || (name.includes("LARSEN") && !name.includes("TECHNOLOGY"))) return "LT";
  if (cleanSym.includes("SONACOMS") || name.includes("SONA BLW")) return "SONACOMS";
  if (cleanSym.includes("HDFCBANK") || name.includes("HDFC BANK")) return "HDFCBANK";
  if (cleanSym.includes("ICICIBANK") || name.includes("ICICI BANK")) return "ICICIBANK";
  if (cleanSym.includes("BAJFINANCE") || name.includes("BAJAJ FINANCE")) return "BAJFINANCE";
  if (cleanSym.includes("CIPLA") || name.includes("CIPLA")) return "CIPLA";
  if (cleanSym.includes("EICHERMOT") || name.includes("EICHER MOTORS")) return "EICHERMOT";
  if (cleanSym.includes("INDUSTOWER") || name.includes("INDUS TOWERS")) return "INDUSTOWER";
  if (cleanSym.includes("KPITTECH") || name.includes("KPIT TECH")) return "KPITTECH";
  if (cleanSym.includes("MCX") || name.includes("MULTI COMMODITY")) return "MCX";
  if (cleanSym.includes("JSWINFRA") || name.includes("JSW INFRA")) return "JSWINFRA";
  if (cleanSym.includes("RELIANCE") || name.includes("RELIANCE IND")) return "RELIANCE";
  if (cleanSym.includes("UPL") || name.includes("UPL LIMITED")) return "UPL";
  if (cleanSym.includes("AUBANK") || name.includes("AU SMALL FINANCE")) return "AUBANK";

  const base = cleanSym
    .replace(/(FUTURES|FUTURE|FUT|SHORT|CE|PE|CALL|PUT)$/gi, "")
    .replace(/\d{6}$/g, "")
    .replace(/\d+$/g, "");

  return base || cleanSym || name.split(" ")[0];
}

export default function HoldingsTable({ holdings, onUpdateHolding, onDeleteHolding, initialCategory = "all", initialSubFilter = "all" }: HoldingsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<AssetType | "all" | "hedged">(initialCategory);

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);
  const [hedgedSubFilter, setHedgedSubFilter] = useState<"all" | "neutral" | "partial" | "over" | "naked_short">(initialSubFilter);

  useEffect(() => {
    if (initialSubFilter) {
      setHedgedSubFilter(initialSubFilter);
    }
  }, [initialSubFilter]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  
  // Expanded group accordions state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Sorting options
  const [sortKey, setSortKey] = useState<"none" | "name" | "investedValue" | "currentValue" | "dailyChangePercent" | "totalGainLossPercent">("none");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleToggleSort = (key: typeof sortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("desc");
    } else if (sortDirection === "desc") {
      setSortDirection("asc");
    } else {
      setSortKey("none");
    }
  };

  // Group all holdings by underlying stock
  const { hedgedGroups, hedgedSymbolSet } = useMemo(() => {
    const map = new Map<string, HoldingWithLiveStats[]>();

    holdings.forEach((h) => {
      const key = getUnderlyingSymbol(h);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(h);
    });

    const groups: HedgedGroupData[] = [];
    const symbolSet = new Set<string>();

    map.forEach((items, key) => {
      const hasLong = items.some(i => i.position === "long" || i.quantity > 0 || i.type === "equity");
      const hasShort = items.some(i => i.position === "short" || i.quantity < 0 || i.type === "derivative");

      // Group qualifies if it has both long & short legs, multiple holdings, or short derivative position
      if ((hasLong && hasShort) || items.length >= 2 || hasShort) {
        items.forEach(i => symbolSet.add(i.id));

        const longH = items.find(i => i.position === "long" || i.quantity > 0 || i.type === "equity");
        const shortH = items.find(i => i.position === "short" || i.quantity < 0 || i.type === "derivative");

        const longInvested = items
          .filter(i => i.position === "long" || i.quantity > 0 || i.type === "equity")
          .reduce((sum, i) => sum + i.investedValue, 0);

        const longCurrentValue = items
          .filter(i => i.position === "long" || i.quantity > 0 || i.type === "equity")
          .reduce((sum, i) => sum + i.currentValue, 0);

        const longQty = items
          .filter(i => i.position === "long" || i.quantity > 0 || i.type === "equity")
          .reduce((sum, i) => sum + i.quantity, 0);

        const shortInvested = items
          .filter(i => i.position === "short" || i.quantity < 0 || i.type === "derivative")
          .reduce((sum, i) => sum + i.investedValue, 0);

        const shortCurrentValue = items
          .filter(i => i.position === "short" || i.quantity < 0 || i.type === "derivative")
          .reduce((sum, i) => sum + i.currentValue, 0);

        const shortAbsValue = Math.abs(shortCurrentValue);

        const shortQty = items
          .filter(i => i.position === "short" || i.quantity < 0 || i.type === "derivative")
          .reduce((sum, i) => sum + i.quantity, 0);

        const netInvestedValue = longInvested + shortInvested;
        const netCurrentValue = longCurrentValue + shortCurrentValue;

        const combinedDailyChangeAmount = items.reduce((sum, i) => sum + i.dailyChangeAmount, 0);
        const combinedTotalGainLossAmount = items.reduce((sum, i) => sum + i.totalGainLossAmount, 0);

        const combinedDailyChangePercent = longCurrentValue > 0
          ? (combinedDailyChangeAmount / longCurrentValue) * 100
          : 0;

        const combinedTotalGainLossPercent = netInvestedValue > 0
          ? (combinedTotalGainLossAmount / Math.abs(netInvestedValue)) * 100
          : 0;

        const hedgeRatioPercent = longCurrentValue > 0 ? (shortAbsValue / longCurrentValue) * 100 : 0;

        let status: "neutral" | "partial" | "over" | "naked_short" = "neutral";
        if (!hasLong || longCurrentValue <= 0) {
          status = "naked_short";
        } else if (hedgeRatioPercent >= 95 && hedgeRatioPercent <= 105) {
          status = "neutral";
        } else if (hedgeRatioPercent > 105) {
          status = "over";
        } else {
          status = "partial";
        }

        const underlyingName = longH ? longH.name : (items[0]?.name || key);
        const industry = items[0]?.industry || "Equity & Derivative";
        const symbol = longH ? longH.symbol : items[0]?.symbol;

        groups.push({
          underlyingKey: key,
          underlyingName,
          industry,
          symbol,
          holdings: items,
          longHolding: longH,
          shortHolding: shortH,
          longInvested,
          longCurrentValue,
          longQty,
          shortInvested,
          shortCurrentValue,
          shortAbsValue,
          shortQty,
          netInvestedValue,
          netCurrentValue,
          combinedDailyChangeAmount,
          combinedDailyChangePercent,
          combinedTotalGainLossAmount,
          combinedTotalGainLossPercent,
          hedgeRatioPercent,
          status
        });
      }
    });

    return { hedgedGroups: groups, hedgedSymbolSet: symbolSet };
  }, [holdings]);

  // Total Hedged Summary Metrics
  const hedgedSummary = useMemo(() => {
    const totalLongVal = hedgedGroups.reduce((acc, g) => acc + g.longCurrentValue, 0);
    const totalShortVal = hedgedGroups.reduce((acc, g) => acc + g.shortAbsValue, 0);
    const netExposure = hedgedGroups.reduce((acc, g) => acc + g.netCurrentValue, 0);
    const dayPnl = hedgedGroups.reduce((acc, g) => acc + g.combinedDailyChangeAmount, 0);
    const totalPnl = hedgedGroups.reduce((acc, g) => acc + g.combinedTotalGainLossAmount, 0);
    const avgCoverage = totalLongVal > 0 ? (totalShortVal / totalLongVal) * 100 : 0;

    return {
      totalPairs: hedgedGroups.length,
      totalLongVal,
      totalShortVal,
      netExposure,
      dayPnl,
      totalPnl,
      avgCoverage
    };
  }, [hedgedGroups]);

  // Advanced typo correction helper
  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  };

  const SYNONYMS: Record<string, string[]> = {
    "rel": ["reliance", "rel", "relfut"],
    "reliance": ["rel", "reliance", "relfut"],
    "itc": ["itc"],
    "hdfc": ["hdfc", "hdfcbank", "hdfclife"],
    "icici": ["icici", "icicibank", "icicipru"],
    "adani": ["adani", "adanient", "adanigreen", "adaniensol"],
    "vbl": ["varun", "beverages", "vbl"],
    "dlf": ["dlf"],
    "lt": ["larsen", "toubro", "l&t", "ltts"],
    "techm": ["tech", "mahindra", "techm"],
    "biocon": ["biocon"],
    "godrej": ["godrej", "properties", "godrejprop"],
    "bajaj": ["bajaj", "finserv"],
    "jsw": ["jsw", "infrastructure", "jswinfra"],
    "fut": ["future", "futures", "fut", "etcd"],
    "hedge": ["hedge", "hedged", "short", "derivative"],
    "ce": ["call", "ce", "option"],
    "pe": ["put", "pe", "option"]
  };

  const tokenizeQuery = (query: string): string[] => {
    let q = query.toLowerCase().trim().replace(/[\s\-_.\^]+/g, " ");
    return q.split(" ").filter(Boolean);
  };

  const advancedFuzzyMatch = (h: HoldingWithLiveStats, queryStr: string): { match: boolean; score: number } => {
    const qTokens = tokenizeQuery(queryStr);
    if (qTokens.length === 0) return { match: true, score: 0 };

    const nameLower = h.name.toLowerCase();
    const symbolLower = h.symbol.toLowerCase();
    const isinLower = h.isin ? h.isin.toLowerCase() : "";

    const cleanQuery = queryStr.toLowerCase().trim().replace(/[\s\-_.\^]+/g, "");
    const cleanName = nameLower.replace(/[\s\-_.\^]+/g, "");
    const cleanSymbol = symbolLower.replace(/[\s\-_.\^]+/g, "");

    if (cleanName === cleanQuery || cleanSymbol === cleanQuery) {
      return { match: true, score: 2500 };
    }

    if (cleanName.includes(cleanQuery) || cleanSymbol.includes(cleanQuery)) {
      return { match: true, score: 1200 - cleanName.indexOf(cleanQuery) };
    }

    let matchCount = 0;
    let totalScore = 0;

    for (const qt of qTokens) {
      if (nameLower.includes(qt) || symbolLower.includes(qt) || isinLower.includes(qt)) {
        matchCount++;
        totalScore += 200;
      }
    }

    const matchRatio = matchCount / qTokens.length;
    const isMatched = matchCount > 0 && (matchRatio >= 0.5 || totalScore >= 200);

    return {
      match: isMatched,
      score: totalScore + (matchRatio * 400),
    };
  };

  // Filter and score holdings
  const scoredHoldings = holdings.map((h) => {
    const matchResult = advancedFuzzyMatch(h, searchTerm);
    
    const matchesCategory =
      searchTerm.trim().length > 0 ||
      activeCategory === "all" ||
      (activeCategory === "hedged" && hedgedSymbolSet.has(h.id)) ||
      (activeCategory === "equity" && (h.type === "equity" || h.type === "reit")) ||
      h.type === activeCategory;

    return {
      holding: h,
      match: matchResult.match && matchesCategory,
      score: matchResult.score,
    };
  });

  const sortedHoldings = [...scoredHoldings.filter((x) => x.match)].sort((a, b) => {
    if (searchTerm.trim().length > 0) {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
    }

    if (sortKey === "none") return 0;

    let aVal: any = a.holding[sortKey];
    let bVal: any = b.holding[sortKey];

    if (sortKey === "name") {
      aVal = a.holding.name.toLowerCase();
      bVal = b.holding.name.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }).map((x) => x.holding);

  // Filtered Hedged Groups for Hedged Tab
  const filteredHedgedGroups = useMemo(() => {
    return hedgedGroups.filter((g) => {
      if (hedgedSubFilter !== "all" && g.status !== hedgedSubFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        g.underlyingName.toLowerCase().includes(q) ||
        g.symbol.toLowerCase().includes(q) ||
        g.underlyingKey.toLowerCase().includes(q) ||
        g.industry.toLowerCase().includes(q)
      );
    });
  }, [hedgedGroups, hedgedSubFilter, searchTerm]);

  // Start editing a row
  const startEdit = (h: HoldingWithLiveStats) => {
    setEditingId(h.id);
    setEditQty(h.quantity.toString());
    setEditPrice(h.avgPrice.toString());
  };

  // Save changes
  const saveEdit = (id: string) => {
    const qty = parseFloat(editQty);
    const prc = parseFloat(editPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc < 0) {
      alert("Please enter valid positive numbers.");
      return;
    }
    onUpdateHolding(id, qty, prc);
    setEditingId(null);
  };

  // Category counts
  const counts = {
    all: holdings.length,
    equity: holdings.filter((h) => h.type === "equity" || h.type === "reit").length,
    derivative: holdings.filter((h) => h.type === "derivative").length,
    hedged: hedgedGroups.length,
    commodity: holdings.filter((h) => h.type === "commodity").length,
    debt: holdings.filter((h) => h.type === "debt").length,
    money_market: holdings.filter((h) => h.type === "money_market").length,
    others: holdings.filter((h) => h.type === "others").length,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-sans">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "all"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All Positions ({counts.all})
          </button>
          
          {/* Highlighted Hedged Stock Pairs Filter Tab */}
          <button
            onClick={() => {
              setActiveCategory("hedged");
              setHedgedSubFilter("all");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === "hedged" && hedgedSubFilter !== "naked_short"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
            }`}
            title="Filter and group stocks with active derivative hedges"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hedged Pairs ({counts.hedged})</span>
          </button>

          {/* Highlighted Naked Shorts Filter Tab */}
          <button
            onClick={() => {
              setActiveCategory("hedged");
              setHedgedSubFilter("naked_short");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === "hedged" && hedgedSubFilter === "naked_short"
                ? "bg-rose-600 text-white shadow-sm font-bold"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80"
            }`}
            title="Filter naked/unhedged short derivative positions"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Naked Shorts ({hedgedGroups.filter(g => g.status === 'naked_short').length})</span>
          </button>

          <button
            onClick={() => setActiveCategory("equity")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "equity"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Equities ({counts.equity})
          </button>
          <button
            onClick={() => setActiveCategory("derivative")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "derivative"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Hedging Shorts ({counts.derivative})
          </button>
          <button
            onClick={() => setActiveCategory("commodity")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "commodity"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Commodities ({counts.commodity})
          </button>
          <button
            onClick={() => setActiveCategory("debt")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "debt"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Debt & Bonds ({counts.debt})
          </button>
          <button
            onClick={() => setActiveCategory("money_market")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "money_market"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Money Market ({counts.money_market})
          </button>
          <button
            onClick={() => setActiveCategory("others")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "others"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            ETFs & Cash ({counts.others})
          </button>
        </div>

        {/* Search & Sort controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {activeCategory !== "hedged" && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sort By:</span>
              <select
                value={`${sortKey}-${sortDirection}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split("-");
                  setSortKey(key as any);
                  setSortDirection(dir as any);
                }}
                className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="none-desc">Default Order</option>
                <option value="dailyChangePercent-desc">Today's % Change (High to Low)</option>
                <option value="dailyChangePercent-asc">Today's % Change (Low to High)</option>
                <option value="totalGainLossPercent-desc">Total Return % (High to Low)</option>
                <option value="totalGainLossPercent-asc">Total Return % (Low to High)</option>
                <option value="currentValue-desc">Current Value (High to Low)</option>
                <option value="investedValue-desc">Invested Value (High to Low)</option>
                <option value="name-asc">Name (A-Z)</option>
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={activeCategory === "hedged" ? "Search hedged ticker or company..." : "Search ticker or name..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-sans"
            />
          </div>
        </div>
      </div>

      {/* ================= HEDGED STOCKS GROUPED VIEW ================= */}
      {activeCategory === "hedged" ? (
        <div className="p-5 bg-slate-50/50 space-y-6">
          {/* Summary Banner for Hedged Portfolio */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-xl p-5 shadow-sm border border-emerald-800/40">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-emerald-800/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Hedged Stock Validation Dashboard
                    </h3>
                    <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-500/40">
                      {hedgedSummary.totalPairs} Pairs Grouped
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 font-sans">
                    Paired view matching cash equity positions with corresponding futures & derivative short hedges.
                  </p>
                </div>
              </div>

              {/* Coverage Gauge Badge */}
              <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700">
                <Scale className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Overall Hedge Coverage</div>
                  <div className="text-sm font-bold font-mono text-emerald-300">
                    {hedgedSummary.avgCoverage.toFixed(1)}% Covered
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs font-sans">
              <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Gross Long Value</div>
                <div className="text-sm font-bold font-mono text-white mt-1">
                  {formatINR(hedgedSummary.totalLongVal)}
                </div>
              </div>

              <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Gross Short Hedge</div>
                <div className="text-sm font-bold font-mono text-rose-300 mt-1">
                  -{formatINR(hedgedSummary.totalShortVal)}
                </div>
              </div>

              <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Net Exposure Delta</div>
                <div className="text-sm font-bold font-mono text-emerald-300 mt-1">
                  {formatINR(hedgedSummary.netExposure)}
                </div>
              </div>

              <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Today's Net Basis P&L</div>
                <div className={`text-sm font-bold font-mono mt-1 ${hedgedSummary.dayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hedgedSummary.dayPnl >= 0 ? '+' : ''}{formatINR(hedgedSummary.dayPnl)}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Filter Controls for Hedged Pairs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coverage Filter:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setHedgedSubFilter("all")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    hedgedSubFilter === "all"
                      ? "bg-slate-900 text-white font-bold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Pairs ({hedgedGroups.length})
                </button>
                <button
                  onClick={() => setHedgedSubFilter("neutral")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    hedgedSubFilter === "neutral"
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Delta Neutral ~100% ({hedgedGroups.filter(g => g.status === 'neutral').length})</span>
                </button>
                <button
                  onClick={() => setHedgedSubFilter("partial")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    hedgedSubFilter === "partial"
                      ? "bg-amber-600 text-white font-bold"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Partial (&lt;95%) ({hedgedGroups.filter(g => g.status === 'partial').length})</span>
                </button>
                <button
                  onClick={() => setHedgedSubFilter("over")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    hedgedSubFilter === "over"
                      ? "bg-indigo-600 text-white font-bold"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Over-Hedged (&gt;105%) ({hedgedGroups.filter(g => g.status === 'over').length})</span>
                </button>
                <button
                  onClick={() => setHedgedSubFilter("naked_short")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    hedgedSubFilter === "naked_short"
                      ? "bg-rose-600 text-white font-bold"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-rose-500" />
                  <span>Naked Shorts (Unhedged 0% Long) ({hedgedGroups.filter(g => g.status === 'naked_short').length})</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredHedgedGroups.length}</span> hedged stock groups
            </div>
          </div>

          {/* Grouped Stock Cards */}
          {filteredHedgedGroups.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto animate-bounce" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No hedged pairs found for filter</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting search or sub-filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHedgedGroups.map((group) => {
                const isExpanded = expandedGroups[group.underlyingKey] !== false; // expanded by default
                const dayIsUp = group.combinedDailyChangeAmount >= 0;
                const totalIsUp = group.combinedTotalGainLossAmount >= 0;

                return (
                  <div 
                    key={group.underlyingKey}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-emerald-300"
                  >
                    {/* Card Header */}
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 mt-0.5">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 font-sans">
                              {group.underlyingName}
                            </h4>
                            <span className="font-mono text-xs text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded uppercase font-semibold">
                              {group.symbol}
                            </span>
                            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded font-sans font-medium">
                              {group.industry}
                            </span>
                            
                            {/* Hedge Status Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              group.status === "neutral"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : group.status === "partial"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : group.status === "over"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300 font-extrabold"
                            }`}>
                              {group.status === "naked_short" ? <ShieldAlert className="w-3 h-3 text-rose-600" /> : <ShieldCheck className="w-3 h-3" />}
                              {group.status === "neutral" && `Delta Neutral (${group.hedgeRatioPercent.toFixed(1)}% Covered)`}
                              {group.status === "partial" && `Partial Hedge (${group.hedgeRatioPercent.toFixed(1)}% Covered)`}
                              {group.status === "over" && `Over-Hedged (${group.hedgeRatioPercent.toFixed(1)}% Covered)`}
                              {group.status === "naked_short" && `Naked Short (0% Cash Backing)`}
                            </span>
                          </div>

                          {/* Dual Balance Visual Gauge */}
                          <div className="flex items-center gap-3 mt-2.5 max-w-md">
                            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden flex">
                              {group.longCurrentValue > 0 ? (
                                <>
                                  <div 
                                    className="bg-indigo-600 h-full" 
                                    style={{ width: `${Math.min(100, (group.longCurrentValue / (group.longCurrentValue + group.shortAbsValue || 1)) * 100)}%` }}
                                    title={`Long Cash Value: ${formatINR(group.longCurrentValue)}`}
                                  />
                                  <div 
                                    className="bg-rose-500 h-full" 
                                    style={{ width: `${Math.min(100, (group.shortAbsValue / (group.longCurrentValue + group.shortAbsValue || 1)) * 100)}%` }}
                                    title={`Short Futures Value: -${formatINR(group.shortAbsValue)}`}
                                  />
                                </>
                              ) : (
                                <div 
                                  className="bg-rose-600 h-full w-full" 
                                  title={`Naked Short Value: -${formatINR(group.shortAbsValue)}`}
                                />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono font-medium whitespace-nowrap">
                              {group.longCurrentValue > 0 ? (
                                <>Cash: <span className="text-indigo-700 font-bold">{formatINR(group.longCurrentValue)}</span> | Hedge: <span className="text-rose-600 font-bold">-{formatINR(group.shortAbsValue)}</span></>
                              ) : (
                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                  ⚠️ Naked Short: -{formatINR(group.shortAbsValue)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Header Summary Statistics */}
                      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap justify-between md:justify-end">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Net Exposure</div>
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {formatINR(group.netCurrentValue)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Today's Combined P&L</div>
                          <div className={`text-xs font-bold font-mono flex items-center justify-end gap-0.5 ${dayIsUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {dayIsUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{dayIsUp ? '+' : ''}{formatINR(group.combinedDailyChangeAmount)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Total Gain/Loss</div>
                          <div className={`text-xs font-bold font-mono ${totalIsUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {totalIsUp ? '+' : ''}{formatINR(group.combinedTotalGainLossAmount)}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleGroupExpand(group.underlyingKey)}
                          className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
                          title={isExpanded ? "Collapse legs table" : "Expand legs table"}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Table for Both Legs */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans border-b border-slate-200 select-none">
                              <th className="py-2.5 px-4">Leg / Instrument</th>
                              <th className="py-2.5 px-4 text-right">Avg Price / Qty</th>
                              <th className="py-2.5 px-4 text-right">Invested Value</th>
                              <th className="py-2.5 px-4 text-right">Live Price / NAV</th>
                              <th className="py-2.5 px-4 text-right">Current Value</th>
                              <th className="py-2.5 px-4 text-right">Today's Change</th>
                              <th className="py-2.5 px-4 text-right">Total Gain/Loss</th>
                              <th className="py-2.5 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.holdings.map((h) => {
                              const isEditing = editingId === h.id;
                              const legDayIsUp = h.dailyChangeAmount >= 0;
                              const legTotalIsUp = h.totalGainLossAmount >= 0;
                              const isShort = h.position === "short" || h.type === "derivative";

                              return (
                                <tr key={h.id} className="hover:bg-slate-50 transition-colors text-xs font-sans group">
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">
                                          {h.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px]">
                                        <span className="font-mono text-slate-400 bg-slate-100 px-1 rounded uppercase">
                                          {h.symbol}
                                        </span>
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider ${
                                          isShort ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                                        }`}>
                                          {isShort ? 'Futures Short Leg' : 'Cash Equity Long Leg'}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Qty & Cost */}
                                  <td className="py-3 px-4 text-right font-mono">
                                    {isEditing ? (
                                      <div className="flex flex-col gap-1 items-end">
                                        <input
                                          type="number"
                                          value={editPrice}
                                          onChange={(e) => setEditPrice(e.target.value)}
                                          className="w-20 px-1 py-0.5 text-xs border rounded text-right"
                                        />
                                        <input
                                          type="number"
                                          value={editQty}
                                          onChange={(e) => setEditQty(e.target.value)}
                                          className="w-20 px-1 py-0.5 text-xs border rounded text-right"
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <div className="text-slate-900 font-medium">
                                          ₹{h.avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {h.quantity.toLocaleString("en-IN")} Units
                                        </div>
                                      </>
                                    )}
                                  </td>

                                  {/* Invested */}
                                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                                    {formatINR(h.investedValue)}
                                  </td>

                                  {/* Live Price */}
                                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                    ₹{h.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>

                                  {/* Current Value */}
                                  <td className={`py-3 px-4 text-right font-mono font-bold ${isShort ? 'text-rose-700' : 'text-slate-900'}`}>
                                    {formatINR(h.currentValue)}
                                  </td>

                                  {/* Today Change */}
                                  <td className={`py-3 px-4 text-right font-mono font-bold ${legDayIsUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    <div>{legDayIsUp ? '+' : ''}{h.dailyChangePercent.toFixed(2)}%</div>
                                    <div className="text-[10px]">{legDayIsUp ? '+' : ''}{formatINR(h.dailyChangeAmount)}</div>
                                  </td>

                                  {/* Total Return */}
                                  <td className={`py-3 px-4 text-right font-mono font-bold ${legTotalIsUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    <div>{legTotalIsUp ? '+' : ''}{h.totalGainLossPercent.toFixed(2)}%</div>
                                    <div className="text-[10px]">{legTotalIsUp ? '+' : ''}{formatINR(h.totalGainLossAmount)}</div>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-4 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => saveEdit(h.id)} className="p-1 bg-emerald-50 text-emerald-600 rounded">
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-1 bg-slate-100 text-slate-500 rounded">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1 opacity-80 hover:opacity-100">
                                        <button onClick={() => startEdit(h)} className="p-1 text-slate-400 hover:text-slate-700 rounded">
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => onDeleteHolding(h.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= STANDARD ALL / CATEGORY POSITIONS TABLE ================= */
        <div className="overflow-x-auto">
          {sortedHoldings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <ShieldAlert className="w-10 h-10 text-slate-300 animate-bounce" />
              <p className="mt-2 text-sm font-semibold text-slate-600 font-sans">
                No holdings found
              </p>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Try adjusting your filters or search criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans border-b border-slate-150 select-none">
                  <th className="py-3.5 px-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("name")}>
                    <div className="flex items-center gap-1">
                      <span>Asset Details</span>
                      {sortKey === "name" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Avg Cost / Qty</th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("investedValue")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Invested Value</span>
                      {sortKey === "investedValue" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Live Price / NAV</th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("currentValue")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Current Value</span>
                      {sortKey === "currentValue" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("dailyChangePercent")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Today's Change</span>
                      {sortKey === "dailyChangePercent" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("totalGainLossPercent")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Return</span>
                      {sortKey === "totalGainLossPercent" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedHoldings.map((h) => {
                  const isEditing = editingId === h.id;
                  const dayIsUp = h.dailyChangeAmount >= 0;
                  const totalIsUp = h.totalGainLossAmount >= 0;
                  const isHedged = hedgedSymbolSet.has(h.id);

                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/50 transition-colors text-xs font-sans group border-b border-slate-100"
                    >
                      {/* Column 1: Asset Details */}
                      <td className="py-4 px-5 max-w-[240px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 leading-tight">
                              {h.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-semibold flex-wrap">
                            <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                              {h.symbol}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                                h.type === "equity"
                                  ? "bg-indigo-50 text-indigo-600"
                                  : h.type === "reit"
                                  ? "bg-sky-50 text-sky-600"
                                  : h.type === "derivative"
                                  ? "bg-rose-50 text-rose-600"
                                  : h.type === "commodity"
                                  ? "bg-orange-50 text-orange-600"
                                  : h.type === "debt"
                                  ? "bg-amber-50 text-amber-600"
                                  : h.type === "money_market"
                                  ? "bg-slate-150 text-slate-700"
                                  : "bg-teal-50 text-teal-600"
                              }`}
                            >
                              {h.type === "equity"
                                ? "Equity"
                                : h.type === "reit"
                                ? "REIT"
                                : h.type === "derivative"
                                ? "Derivative Short"
                                : h.type === "commodity"
                                ? "Commodity Fut"
                                : h.type === "debt"
                                ? "Sovereign Debt"
                                : h.type === "money_market"
                                ? "Money Market"
                                : "ETF / Cash"}
                            </span>

                            {/* Position (Long/Short) badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                                h.position === "long"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {h.position}
                            </span>

                            {/* Clickable Hedged Badge */}
                            {isHedged && (
                              <button
                                onClick={() => {
                                  setActiveCategory("hedged");
                                  setSearchTerm(getUnderlyingSymbol(h));
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 flex items-center gap-1 cursor-pointer transition-all"
                                title="Click to view hedged group validation"
                              >
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>Hedged</span>
                              </button>
                            )}

                            {h.subCategory && (
                              <span className="text-slate-400 font-medium">
                                {h.subCategory}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Avg Cost / Qty */}
                      <td className="py-4 px-4 text-right font-mono">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 items-end justify-end">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">P:</span>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-20 px-1 py-0.5 text-xs bg-white border border-slate-300 rounded text-right focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Q:</span>
                              <input
                                type="number"
                                value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                                className="w-20 px-1 py-0.5 text-xs bg-white border border-slate-300 rounded text-right focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-slate-900 font-medium">
                              ₹{h.avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {h.quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 })} Units
                            </div>
                          </>
                        )}
                      </td>

                      {/* Column 3: Invested Value */}
                      <td className="py-4 px-4 text-right font-mono text-slate-900 font-medium">
                        {formatINR(h.investedValue)}
                      </td>

                      {/* Column 4: Live Price / NAV */}
                      <td className="py-4 px-4 text-right font-mono">
                        <div className="text-slate-900 font-bold">
                          ₹{h.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          {h.isEstimate && (
                            <span
                              className="text-[8px] bg-sky-50 text-sky-600 px-1 rounded font-sans uppercase font-bold"
                              title="Market is open. NAV estimated live using Nifty 50 movement index proxy."
                            >
                              Estimated Proxy
                            </span>
                          )}
                          {!h.isEstimate && h.type === "others" && (
                            <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded font-sans uppercase">
                              Official AMFI
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400">
                            {h.lastUpdated}
                          </span>
                        </div>
                      </td>

                      {/* Column 5: Current Value */}
                      <td className="py-4 px-4 text-right font-mono text-slate-900 font-bold">
                        {formatINR(h.currentValue)}
                      </td>

                      {/* Column 6: Today's Change */}
                      <td
                        className={`py-4 px-4 text-right font-mono font-bold ${
                          dayIsUp ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          {dayIsUp ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {dayIsUp ? "+" : ""}
                            {h.dailyChangePercent.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {dayIsUp ? "+" : ""}
                          {formatINR(h.dailyChangeAmount)}
                        </div>
                      </td>

                      {/* Column 7: Total Return */}
                      <td
                        className={`py-4 px-4 text-right font-mono font-bold ${
                          totalIsUp ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        <div>
                          {totalIsUp ? "+" : ""}
                          {h.totalGainLossPercent.toFixed(2)}%
                        </div>
                          <div className="text-[10px] mt-0.5">
                          {totalIsUp ? "+" : ""}
                          {formatINR(h.totalGainLossAmount)}
                        </div>
                      </td>

                      {/* Column 8: Actions */}
                      <td className="py-4 px-5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveEdit(h.id)}
                              className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded cursor-pointer transition-colors"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(h)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded cursor-pointer transition-colors"
                              title="Edit Holding"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${h.name} from your portfolio?`)) {
                                  onDeleteHolding(h.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded cursor-pointer transition-colors"
                              title="Delete Holding"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
