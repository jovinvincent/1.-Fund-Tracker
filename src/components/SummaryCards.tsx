import { TrendingUp, TrendingDown, DollarSign, Briefcase, Percent, Layers } from "lucide-react";
import { PortfolioSummary, HoldingWithLiveStats } from "../types";

interface SummaryCardsProps {
  summary: PortfolioSummary;
  holdings: HoldingWithLiveStats[];
}

export function formatINR(val: number): string {
  return "₹" + val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SummaryCards({ summary, holdings }: SummaryCardsProps) {
  // Compute asset allocation percentages
  const longEquityVal = holdings
    .filter((h) => h.type === "equity" || h.type === "reit")
    .reduce((sum, h) => sum + h.currentValue, 0);
  const shortsVal = holdings
    .filter((h) => h.type === "derivative")
    .reduce((sum, h) => sum + h.currentValue, 0);
  const commodityVal = holdings
    .filter((h) => h.type === "commodity" || (h.type === "others" && (h.name.toLowerCase().includes("bees") || h.name.toLowerCase().includes("silver"))))
    .reduce((sum, h) => sum + h.currentValue, 0);
  const debtCashVal = holdings
    .filter((h) => h.type === "debt" || h.type === "money_market" || (h.type === "others" && !h.name.toLowerCase().includes("bees") && !h.name.toLowerCase().includes("silver")))
    .reduce((sum, h) => sum + h.currentValue, 0);

  const total = longEquityVal + shortsVal + commodityVal + debtCashVal || 1;
  const equityPct = (longEquityVal / total) * 100;
  const shortsPct = (shortsVal / total) * 100;
  const commodityPct = (commodityVal / total) * 100;
  const debtCashPct = (debtCashVal / total) * 100;

  // Day's Change
  const dayIsUp = summary.dailyChangeAmount >= 0;
  const totalIsUp = summary.totalGainLossAmount >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* CARD 1: Portfolio Value */}
      <div className="bg-[#0d111c] rounded-xl shadow-sm border border-[#1e293b] p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">
            Portfolio NAV
          </span>
          <div className="p-2 bg-emerald-950/40 text-emerald-400 rounded-lg border border-emerald-800/30">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight block">
            {formatINR(summary.totalCurrent)}
          </span>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-slate-400">Invested:</span>
            <span className="text-xs font-semibold font-mono text-slate-300">
              {formatINR(summary.totalInvested)}
            </span>
          </div>
        </div>
        {/* Subtle decorative grid line */}
        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-full" />
      </div>

      {/* CARD 2: Today's Change % */}
      <div className="bg-[#0d111c] rounded-xl shadow-sm border border-[#1e293b] p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">
            Today's Change
          </span>
          <div
            className={`p-2 rounded-lg border ${
              dayIsUp ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/30" : "bg-rose-950/40 text-rose-400 border-rose-800/30"
            }`}
          >
            {dayIsUp ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
        </div>
        <div className="mt-4">
          <span
            className={`text-2xl md:text-3xl font-bold font-mono tracking-tight block ${
              dayIsUp ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {dayIsUp ? "+" : ""}
            {summary.dailyChangePercent.toFixed(2)}%
          </span>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`text-xs font-bold font-mono ${
                dayIsUp ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {dayIsUp ? "+" : ""}
              {formatINR(summary.dailyChangeAmount)}
            </span>
            <span className="text-xs text-slate-500">today</span>
          </div>
        </div>
        <div
          className={`absolute bottom-0 left-0 h-1 w-full ${
            dayIsUp ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
      </div>

      {/* CARD 3: Cumulative Performance */}
      <div className="bg-[#0d111c] rounded-xl shadow-sm border border-[#1e293b] p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">
            Total Profit / Loss
          </span>
          <div
            className={`p-2 rounded-lg border ${
              totalIsUp ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/30" : "bg-rose-950/40 text-rose-400 border-rose-800/30"
            }`}
          >
            <Percent className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <span
            className={`text-2xl md:text-3xl font-bold font-mono tracking-tight block ${
              totalIsUp ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {totalIsUp ? "+" : ""}
            {summary.totalGainLossPercent.toFixed(2)}%
          </span>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`text-xs font-bold font-mono ${
                totalIsUp ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {totalIsUp ? "+" : ""}
              {formatINR(summary.totalGainLossAmount)}
            </span>
            <span className="text-xs text-slate-500">all-time returns</span>
          </div>
        </div>
        <div
          className={`absolute bottom-0 left-0 h-1 w-full ${
            totalIsUp ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
      </div>

      {/* CARD 4: Asset Allocation Summary */}
      <div className="bg-[#0d111c] rounded-xl shadow-sm border border-[#1e293b] p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">
            Asset Breakdown
          </span>
          <div className="p-2 bg-indigo-950/40 text-indigo-400 rounded-lg border border-indigo-800/30">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {/* Equities bar */}
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Gross Equities</span>
              <span className="font-mono text-slate-300">{equityPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${equityPct}%` }} />
            </div>
          </div>
          {/* Hedging Shorts bar */}
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Hedging Shorts</span>
              <span className="font-mono text-slate-300">{shortsPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${shortsPct}%` }} />
            </div>
          </div>
          {/* Commodities bar */}
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Commodities</span>
              <span className="font-mono text-slate-300">{commodityPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${commodityPct}%` }} />
            </div>
          </div>
          {/* Debt bar */}
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Debt & Cash</span>
              <span className="font-mono text-slate-300">{debtCashPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${debtCashPct}%` }} />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 w-full" />
      </div>
    </div>
  );
}
