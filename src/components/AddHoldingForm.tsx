import { useState } from "react";
import { Sparkles, ArrowRight, ShieldAlert, TrendingUp, Info } from "lucide-react";

interface AddHoldingFormProps {
  investmentAmount: number;
  onInvestmentAmountChange: (amount: number) => void;
}

export default function AddHoldingForm({
  investmentAmount,
  onInvestmentAmountChange,
}: AddHoldingFormProps) {
  const [inputValue, setInputValue] = useState(investmentAmount.toString());

  const handleApply = () => {
    const parsed = parseFloat(inputValue.replace(/,/g, ""));
    if (isNaN(parsed) || parsed <= 0) {
      alert("Please enter a valid positive investment amount.");
      return;
    }
    onInvestmentAmountChange(parsed);
  };

  const handleQuickSelect = (amount: number) => {
    setInputValue(amount.toString());
    onInvestmentAmountChange(amount);
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 p-5 space-y-5 flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider font-sans text-slate-200">
            Investment Configurator
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-sans">
          Configure capital allocation across all 5 <b>QSIF India Long-Short Funds</b> (including the <b>qsif Hybrid Long-Short Fund</b> as on 31 July 2026).
        </p>
      </div>

      {/* Input Field */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block font-sans">
          Total Investment (INR)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs">
              ₹
            </span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full pl-7 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
            />
          </div>
          <button
            onClick={handleApply}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Apply</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[50000, 100000, 250000, 500000, 1000000].map((amt) => (
            <button
              key={amt}
              onClick={() => handleQuickSelect(amt)}
              className={`px-2 py-1 text-[10px] rounded font-semibold font-mono border transition-all cursor-pointer ${
                investmentAmount === amt
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"
              }`}
            >
              ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 1 : 2)}L
            </button>
          ))}
        </div>
      </div>

      {/* Fund Strategy & Hedging Info */}
      <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-850/60 space-y-3">
        <div className="flex items-center gap-1.5 text-slate-200">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-bold tracking-wide uppercase font-sans">
            Strategy & Hedging Architecture
          </span>
        </div>

        <div className="space-y-2.5 text-[10px] font-sans text-slate-400 leading-relaxed">
          <div className="flex gap-2 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
            <p>
              <b className="text-slate-300">Equity & Derivatives Hedges:</b> The portfolio holds long equity positions (~109.99% exposure) hedged with active index & stock options / future shorts (~-9.99%). This dampens high volatility.
            </p>
          </div>

          <div className="flex gap-2 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
            <p>
              <b className="text-slate-300">Commodity Diversification:</b> MCX Gold and Silver Futures as well as liquid commodity exchange-traded proxies protect your capital from currency devaluation and global inflation.
            </p>
          </div>

          <div className="flex gap-2 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1" />
            <p>
              <b className="text-slate-300">Sovereign Debt Stability:</b> High-rated sovereign G-Sec bonds and commercial paper yield safe interest returns during macroeconomic cycles.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-850/40 flex items-center justify-between text-[9px] font-mono text-slate-500">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Gross Exposure: ~120%</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>Shorts (Hedges): ~10%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
