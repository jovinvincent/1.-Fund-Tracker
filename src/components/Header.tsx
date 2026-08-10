import { RefreshCw, Radio, Settings, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { IndexProxy } from "../types";

interface HeaderProps {
  nifty: IndexProxy | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  isFallback: boolean;
  lastUpdated: Date | null;
}

export default function Header({
  nifty,
  isRefreshing,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
  isFallback,
  lastUpdated,
}: HeaderProps) {
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
    : "--:--:--";

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white py-4 px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Identity */}
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500 text-slate-900 rounded-md font-bold tracking-tighter text-xs">
              LIVE
            </span>
            <h1 className="text-xl md:text-2xl font-bold font-sans tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Fund Tracker
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Active ₹1 Lakh Investment Live Tracker (Equity, Debt, Commodities, & Hedging Shorts)
          </p>
        </div>

        {/* Nifty 50 Banner Indicator */}
        {nifty && (
          <div className="hidden lg:flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-full py-1.5 px-4">
            <span className="text-xs text-slate-400 font-mono tracking-wider font-semibold">
              INDEX:
            </span>
            <span className="text-xs font-semibold font-sans">Nifty 50</span>
            <span className="text-xs font-mono font-medium text-slate-200">
              ₹{nifty.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div
              className={`flex items-center gap-0.5 text-xs font-mono font-bold ${
                nifty.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {nifty.changePercent >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {nifty.changePercent >= 0 ? "+" : ""}
                {nifty.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Sync Status and Actions */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          {/* Fallback Warning / Live Connected Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium font-sans ${
              isFallback
                ? "bg-amber-950/40 border-amber-800 text-amber-300"
                : "bg-emerald-950/40 border-emerald-800 text-emerald-300"
            }`}
            title={
              isFallback
                ? "API rate limits reached. Displaying ticking micro-drift simulated fallback."
                : "Successfully connected to active server feed proxy."
            }
          >
            {isFallback ? (
              <>
                <AlertTriangle className="w-3 h-3 animate-pulse text-amber-400" />
                <span>Fallback Mode</span>
              </>
            ) : (
              <>
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                <span>Live Feed</span>
              </>
            )}
          </div>

          {/* Sync Time */}
          <div className="text-xs text-slate-400 font-mono text-right hidden sm:block">
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">
              Last Synced
            </span>
            <span className="font-medium text-slate-300">{formattedTime}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Auto-refresh checkbox */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-700 select-none text-xs transition-colors">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={onToggleAutoRefresh}
                className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
              />
              <span className="text-slate-300 font-medium font-sans">
                Auto-Sync (60s)
              </span>
            </label>

            {/* Manual Refresh Trigger */}
            <button
              id="refresh-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs rounded-lg transition-all border border-transparent shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Syncing..." : "Sync"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
