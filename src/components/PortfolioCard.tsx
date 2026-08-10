import React from "react";
import { Portfolio, Holding } from "../types";
import { formatINR } from "../utils";

interface PortfolioCardProps {
  port: Portfolio;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  investmentAmount: number;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ port, isExpanded, onToggleExpand, investmentAmount }) => {
  const summary = port.summary!;
  const isUp = summary.dailyChangePercent >= 0;

  return (
    <div 
      key={port.id} 
      id={`portfolio-card-${port.id}`}
      className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-2 shadow-sm relative overflow-hidden group hover:border-[#334155] transition-all duration-300"
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${isUp ? "bg-emerald-500" : "bg-rose-500"}`} />

      <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => onToggleExpand(port.id)}>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs sm:text-sm font-black text-white tracking-tight break-words">
            {port.name}
          </h2>
          {isExpanded && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-slate-400 font-medium font-sans">
              <span className="font-bold text-slate-200">AUM {port.aum}</span>
              <span className="text-slate-600">•</span>
              <span>{port.holdings.length} holdings</span>
              <span className="text-slate-600">•</span>
              <div className="flex flex-wrap gap-1.5">
                {port.typeTags.map((tag) => (
                  <span 
                    key={tag} 
                    className="px-1.5 py-0.5 bg-slate-800/60 text-slate-300 rounded font-mono text-[9px] uppercase tracking-wider"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <div className={`text-base sm:text-lg md:text-2xl font-black font-mono flex items-center justify-end gap-1 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
            <span>{isUp ? "+" : ""}{summary.dailyChangePercent.toFixed(2)}%</span>
          </div>
          {isExpanded && (
            <p className="text-[10px] text-slate-500 font-mono tracking-wider text-right mt-1 font-semibold uppercase">
              {port.dateRange}
            </p>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-1 pt-1 border-t border-[#1e293b]/60">
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 font-bold mb-2 font-sans px-0.5 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <span className="truncate">Allocated: {port.allocatedPct.toFixed(2)}% ({formatINR(summary.totalCurrent - (investmentAmount * port.cashPct / 100))})</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
              <span className="truncate">Cash: {port.cashPct.toFixed(2)}% ({formatINR(investmentAmount * port.cashPct / 100)})</span>
            </div>
          </div>

          <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            <div 
              className="bg-indigo-500 h-full transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, port.allocatedPct))}%` }}
            />
            <div 
              className="bg-slate-600 h-full transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, port.cashPct))}%` }}
            />
          </div>
        </div>
      )}

    </div>
  );
};
