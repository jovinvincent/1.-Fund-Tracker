import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { HoldingWithLiveStats } from "../types";
import { formatINR } from "./SummaryCards";

interface AnalyticsPanelProps {
  holdings: HoldingWithLiveStats[];
}

export default function AnalyticsPanel({ holdings }: AnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState<"allocation" | "performance">("allocation");

  // Calculate values
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

  const allocationData = [
    { name: "Listed Equities", value: Math.round(longEquityVal), color: "#6366f1" },
    { name: "Hedging Shorts", value: Math.round(shortsVal), color: "#f43f5e" },
    { name: "Commodity Derivatives", value: Math.round(commodityVal), color: "#f59e0b" },
    { name: "Debt, CD/CP & Cash", value: Math.round(debtCashVal), color: "#10b981" },
  ];

  // Performance data (Profit/Loss of top 6 holdings)
  const sortedPerformance = [...holdings]
    .map((h) => ({
      name: h.name.length > 18 ? h.name.slice(0, 15) + "..." : h.name,
      symbol: h.symbol,
      pnl: Math.round(h.totalGainLossAmount),
      color: h.totalGainLossAmount >= 0 ? "#10b981" : "#f43f5e",
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)) // Sort by absolute PnL value
    .slice(0, 6); // Grab top 6

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 border border-slate-700 rounded-lg shadow-xl text-xs font-sans">
          <p className="font-semibold text-slate-300">{payload[0].name}</p>
          <p className="font-mono mt-1 font-bold text-sm">
            {formatINR(payload[0].value)}
          </p>
          <p className="text-slate-400 font-mono mt-0.5">
            {((payload[0].value / total) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-slate-900 text-white p-3 border border-slate-700 rounded-lg shadow-xl text-xs font-sans">
          <p className="font-semibold text-slate-300">{payload[0].payload.symbol}</p>
          <p className="text-slate-400 mt-0.5">{payload[0].payload.name}</p>
          <p className={`font-mono mt-1.5 font-bold text-sm ${value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            PnL: {value >= 0 ? "+" : ""}{formatINR(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-150 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
          Portfolio Insights
        </h2>
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-sans">
          <button
            onClick={() => setActiveTab("allocation")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "allocation"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Asset Allocation
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "performance"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Top PnL Movers
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row items-center justify-center min-h-[250px] gap-8">
        {activeTab === "allocation" ? (
          <>
            {/* Pie Chart container */}
            <div className="w-full md:w-1/2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Allocation Legend Details */}
            <div className="w-full md:w-1/2 space-y-4">
              {allocationData.map((entry, index) => (
                <div key={index} className="flex items-start justify-between border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-semibold text-slate-700">{entry.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-slate-900 block">{formatINR(entry.value)}</span>
                    <span className="text-[10px] text-slate-400">
                      {((entry.value / total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full h-[250px] px-2">
            {sortedPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 font-sans">
                Add holdings to see performance charts
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedPerformance}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} fontClassName="font-mono" tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={10}
                    width={90}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc", opacity: 0.5 }} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {sortedPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
