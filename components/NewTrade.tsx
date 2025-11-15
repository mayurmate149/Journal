/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Trade } from "../types/trade";
import { confirm, successToast, errorAlert } from "./swal";
import { strategyDiagrams } from "./strategyDiagrams";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  tradeId?: string | null;
}

const defaultTrade = (): Trade => {
  const now = new Date();
  const currentTime = now.toTimeString().split(" ")[0].slice(0, 5); 

  return {
    date: now.toISOString().split("T")[0],     
    trade_exit_date: "",
    symbol: "",
    strategy: "",
    view: "",
    entry_reason: "",
    entry_time: currentTime,                   
    capital_deployed: 0,
    premium_gain: 0,
    expected_profit: 0,
    max_loss_allowed: 0,
    profit_booked: 0,
    loss_booked: 0,
    exit_trigger: "Exit on target / Stop Loss",
    adjustment_plan: "",
    adjustment_notes: "",
    notes_learning: "",
    status: "OPEN",                            
    lots: 0,
    pre_trade_mindset: "",
    emotional_state_entry: "Neutral",
    confidence_level: 5,
    fomo_fear: "None",
    greed_indicator: "None",
    discipline_level: "High",
    trade_setup_conviction: "High",
    emotional_state_exit: "",
    behavioral_notes: "",
  };
};


function toDateInput(value: any) {
  if (!value && value !== 0) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return "";
  }
  if (typeof value === "number") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return "";
}

function normalizeTradeInput(t: any): Trade {
  const base = { ...defaultTrade(), ...(t || {}) };
  return {
    ...base,
    date: toDateInput(base.date) || defaultTrade().date,
    trade_exit_date: toDateInput(base.trade_exit_date) || "",
    capital_deployed: Number(base.capital_deployed ?? 0),
    premium_gain: Number(base.premium_gain ?? 0),
    expected_profit: Number(base.expected_profit ?? 0),
    max_loss_allowed: Number(base.max_loss_allowed ?? 0),
    profit_booked: Number(base.profit_booked ?? 0),
    loss_booked: Number(base.loss_booked ?? 0),
    lots: Number(base.lots ?? 0),
  };
}

export default function NewTrade({ isOpen, onClose, onSave, tradeId }: Props) {
  const [trade, setTrade] = useState<Trade>(defaultTrade());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "entry" | "exit" | "psychology" | "notes">("overview");

  useEffect(() => {
    let mounted = true;
    const fetchTrade = async (id: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/trades/${encodeURIComponent(id)}`);
        if (!res.ok) {
          console.warn("fetch trade failed", res.status);
          return;
        }
        const json = await res.json();
        if (!mounted) return;
        const remote = json?.trade ?? json;
        setTrade(normalizeTradeInput(remote));
      } catch (err) {
        console.error("fetchTrade error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (isOpen) {
      if (tradeId) {
        fetchTrade(tradeId);
      } else {
        setTrade(defaultTrade());
      }
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, tradeId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const numValue = type === "number" ? (value === "" ? 0 : Number(value)) : value;
    
    setTrade((prev) => {
      const updated = {
        ...prev,
        [name]: numValue,
      } as Trade;
      
      // Auto-calculate expected_profit (2%) and max_loss_allowed (1%) when capital_deployed changes
      if (name === "capital_deployed" && typeof numValue === "number") {
        updated.expected_profit = Math.round(numValue * 0.02); // 2% of capital
        updated.max_loss_allowed = Math.round(numValue * 0.01); // 1% of capital
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    if (!trade.entry_reason || !trade.entry_time || !trade.exit_trigger) {
      await errorAlert("Missing fields", "Please fill mandatory fields");
      return;
    }

    const proceed = await confirm("Save trade?", tradeId ? "This will update the trade." : "This will create a new trade.", "Save", "Cancel");
    if (!proceed) return;

    const payload = normalizeTradeInput(trade);
    if (tradeId) (payload as any).id = tradeId;

    try {
      // allow parent onSave to be async or sync
      await Promise.resolve(onSave(payload));
      successToast(tradeId ? "Trade updated" : "Trade saved");
      onClose();
      setTrade(defaultTrade());
    } catch (err) {
      console.error("Save failed", err);
      await errorAlert("Save failed", String(err ?? "Unknown error"));
    }
  };

  const strategies = [
    "Iron Condor",
    "Iron Butterfly", 
    "Credit Call Spread",
    "Credit Put Spread",
    "Debit Call Spread",
    "Debit Put Spread",
    "Long Call",
    "Long Put",
    "Short Call",
    "Short Put",
    "Straddle",
    "Strangle",
    "Call Ratio Spread",
    "Put Ratio Spread",
    "Calendar Spread",
    "Diagonal Spread",
    "Condor",
    "Butterfly",
    "Covered Call",
    "Collar",
    "Long Stock",
    "Short Stock",
    "Covered Put",
    "Custom Strategy"
  ];
  const views = ["Bullish", "Bearish", "Neutral", "Bullish Bias", "Bearish Bias", "Neutral Bias"];
  const statuses = ["OPEN", "CLOSED", "ADJUSTED", "CANCELLED", "PARTIAL"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h2 className="text-3xl font-bold text-white mb-1">
            {loading ? "⏳ Loading..." : tradeId ? "✏️ Edit Trade" : "🎯 New Trade Entry"}
          </h2>
          <p className="text-blue-100">Record every detail to build your trading edge</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50 px-8">
          <div className="flex gap-8 overflow-x-auto">
            {[
              { id: "overview", label: "📋 Overview", icon: "📋" },
              { id: "entry", label: "📍 Entry", icon: "📍" },
              { id: "exit", label: "🚪 Exit", icon: "🚪" },
              { id: "psychology", label: "🧠 Psychology", icon: "🧠" },
              { id: "notes", label: "📚 Notes", icon: "📚" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-4 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trade Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Entry Date *</label>
                  <input 
                    type="date" 
                    name="date" 
                    value={trade.date} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Entry Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Entry Time *</label>
                  <input 
                    type="time" 
                    name="entry_time" 
                    value={trade.entry_time} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Symbol *</label>
                  <select 
                    name="symbol" 
                    value={trade.symbol} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Select Symbol</option>
                    <option value="NIFTY">NIFTY 50</option>
                    <option value="BANKNIFTY">BANK NIFTY</option>
                    <option value="FINNIFTY">FINNIFTY</option>
                    <option value="MIDCPNIFTY">MIDCPNIFTY</option>
                    <option value="NIFTYNXT50">NIFTYNXT50</option>
                    <option value="NIFTYPHARMA">NIFTYPHARMA</option>
                    <option value="NIFTYIT">NIFTYIT</option>
                    <option value="NIFTYBANK">NIFTYBANK</option>
                  </select>
                </div>

                {/* Strategy with Diagram */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Strategy *</label>
                    <select 
                      name="strategy" 
                      value={trade.strategy} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="">Select Strategy</option>
                      {strategies.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="w-40 min-w-[120px] flex flex-col items-center">
                    {trade.strategy && strategyDiagrams[trade.strategy] ? (
                      <img
                        src={strategyDiagrams[trade.strategy]}
                        alt={trade.strategy + " diagram"}
                        className="w-full h-24 object-contain border rounded bg-white shadow"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center border rounded bg-gray-50 text-gray-400 text-xs text-center p-2">
                        {trade.strategy ? "No diagram available" : "Select a strategy to see diagram"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Market View */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Market View *</label>
                  <select 
                    name="view" 
                    value={trade.view} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Select View</option>
                    {views.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select 
                    name="status" 
                    value={trade.status} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Entry Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Entry Reason *</label>
                <input 
                  type="text" 
                  name="entry_reason" 
                  placeholder="e.g., Support Bounce, Resistance Break, Technical Setup"
                  value={trade.entry_reason} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}

          {/* Entry Tab */}
          {activeTab === "entry" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lots</label>
                  <input 
                    type="number" 
                    name="lots" 
                    value={trade.lots} 
                    onChange={handleChange} 
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capital Deployed (₹)</label>
                  <input 
                    type="number" 
                    name="capital_deployed" 
                    value={trade.capital_deployed} 
                    onChange={handleChange} 
                    step="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Premium Collected (₹)</label>
                  <input 
                    type="number" 
                    name="premium_gain" 
                    value={trade.premium_gain} 
                    onChange={handleChange} 
                    step="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Profit (₹)</label>
                <input 
                  type="number" 
                  name="expected_profit" 
                  value={trade.expected_profit} 
                  onChange={handleChange} 
                  step="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600"><strong>💡 Tip:</strong> Set realistic profit targets based on your risk-to-reward ratio</p>
              </div>
            </div>
          )}

          {/* Exit Tab */}
          {activeTab === "exit" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Exit Date</label>
                  <input 
                    type="date" 
                    name="trade_exit_date" 
                    value={trade.trade_exit_date} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Loss Allowed (₹)</label>
                  <input 
                    type="number" 
                    name="max_loss_allowed" 
                    value={trade.max_loss_allowed} 
                    onChange={handleChange} 
                    step="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Profit Booked (₹)</label>
                  <input 
                    type="number" 
                    name="profit_booked" 
                    value={trade.profit_booked} 
                    onChange={handleChange} 
                    step="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Loss Booked (₹)</label>
                  <input 
                    type="number" 
                    name="loss_booked" 
                    value={trade.loss_booked} 
                    onChange={handleChange} 
                    step="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Exit Trigger *</label>
                <input 
                  type="text" 
                  name="exit_trigger" 
                  placeholder="e.g., Target Reached, Stop Loss Hit, Manual Exit"
                  value={trade.exit_trigger} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Trade Results Summary */}
              {(trade.profit_booked || trade.loss_booked) && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-4">📊 Trade Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Net P&L</p>
                      <p className={`text-xl font-bold ${(trade.profit_booked - trade.loss_booked) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(trade.profit_booked - trade.loss_booked) >= 0 ? '✅' : '❌'} ₹{Math.abs(trade.profit_booked - trade.loss_booked).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Risk:Reward</p>
                      <p className="text-xl font-bold text-blue-600">
                        {trade.max_loss_allowed > 0 && trade.expected_profit > 0 
                          ? `1:${(trade.expected_profit / trade.max_loss_allowed).toFixed(2)}` 
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">ROI</p>
                      <p className="text-xl font-bold text-purple-600">
                        {trade.capital_deployed > 0 
                          ? `${((trade.profit_booked - trade.loss_booked) / trade.capital_deployed * 100).toFixed(1)}%` 
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Days Held</p>
                      <p className="text-xl font-bold text-gray-600">
                        {trade.trade_exit_date && trade.date !== trade.trade_exit_date
                          ? Math.ceil((new Date(trade.trade_exit_date).getTime() - new Date(trade.date).getTime()) / (1000 * 60 * 60 * 24))
                          : 'Open'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Psychology Tab */}
          {activeTab === "psychology" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pre-Trade Mindset</label>
                  <select 
                    name="pre_trade_mindset" 
                    value={trade.pre_trade_mindset || ""} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Select Mindset</option>
                    <option value="Confident">Confident & Ready</option>
                    <option value="Cautious">Cautious & Observing</option>
                    <option value="Aggressive">Aggressive & Seeking</option>
                    <option value="Defensive">Defensive & Protective</option>
                    <option value="Uncertain">Uncertain & Doubtful</option>
                    <option value="Overconfident">Overconfident & Reckless</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Emotional State - Entry</label>
                  <select 
                    name="emotional_state_entry" 
                    value={trade.emotional_state_entry || ""} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="Calm">Calm & Focused</option>
                    <option value="Excited">Excited & Energized</option>
                    <option value="Anxious">Anxious & Worried</option>
                    <option value="Frustrated">Frustrated from Losses</option>
                    <option value="Overconfident">Overconfident from Wins</option>
                    <option value="Neutral">Neutral & Balanced</option>
                    <option value="Stressed">Stressed & Rushed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confidence Level (1-10)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      name="confidence_level" 
                      value={trade.confidence_level || 5} 
                      onChange={handleChange}
                      className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-2xl font-bold text-blue-600 w-12 text-center">{trade.confidence_level || 5}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">FOMO/Fear Indicator</label>
                  <select 
                    name="fomo_fear" 
                    value={trade.fomo_fear || ""} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="None">None - Planned Trade</option>
                    <option value="Slight FOMO">Slight FOMO</option>
                    <option value="Strong FOMO">Strong FOMO</option>
                    <option value="Slight Fear">Slight Fear</option>
                    <option value="Strong Fear">Strong Fear - Miss Out</option>
                    <option value="Panic">Panic Entry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Greed Indicator</label>
                  <select 
                    name="greed_indicator" 
                    value={trade.greed_indicator || ""} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="None">None - Disciplined</option>
                    <option value="Slight">Slight - Wanting More</option>
                    <option value="Moderate">Moderate - Chasing Profits</option>
                    <option value="High">High - Over-sizing Position</option>
                    <option value="Extreme">Extreme - All-in Mentality</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Discipline Level</label>
                  <select 
                    name="discipline_level" 
                    value={trade.discipline_level || ""} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="Very High">Very High - Strict Plan</option>
                    <option value="High">High - Followed Plan</option>
                    <option value="Medium">Medium - Some Deviations</option>
                    <option value="Low">Low - Ignored Plan</option>
                    <option value="Very Low">Very Low - Impulsive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Trade Setup Conviction</label>
                  <select 
                    name="trade_setup_conviction" 
                    value={trade.trade_setup_conviction || ""} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="Very High">Very High - Perfect Setup</option>
                    <option value="High">High - Strong Signals</option>
                    <option value="Medium">Medium - Reasonable Setup</option>
                    <option value="Low">Low - Marginal Setup</option>
                    <option value="Very Low">Very Low - Forced Entry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Emotional State - Exit</label>
                  <select 
                    name="emotional_state_exit" 
                    value={trade.emotional_state_exit || ""} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Select Exit Emotion</option>
                    <option value="Relief">Relief & Satisfied</option>
                    <option value="Regret">Regret - Left Money</option>
                    <option value="Anger">Anger - Forced Out</option>
                    <option value="Fear">Fear - Cut Loss Early</option>
                    <option value="Overjoyed">Overjoyed - Big Winner</option>
                    <option value="Disappointed">Disappointed - Loss</option>
                    <option value="Indifferent">Indifferent - Small Move</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Behavioral Insights</label>
                <textarea 
                  name="behavioral_notes" 
                  placeholder="Did you follow your plan? Emotional triggers? Mental patterns? Psychology impact?"
                  value={trade.behavioral_notes || ""} 
                  onChange={(e) => setTrade({...trade, behavioral_notes: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Adjustment Plan</label>
                  <input 
                    type="text" 
                    name="adjustment_plan" 
                    placeholder="e.g., Close short legs, Roll positions"
                    value={trade.adjustment_plan} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Adjustment Notes</label>
                  <input 
                    type="text" 
                    name="adjustment_notes" 
                    placeholder="Adjustments made during the trade"
                    value={trade.adjustment_notes} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Learning & Review</label>
                <textarea 
                  name="notes_learning" 
                  placeholder="What worked? What didn't? Key takeaways? How to improve?"
                  value={trade.notes_learning} 
                  onChange={(e) => setTrade({...trade, notes_learning: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-gray-700"><strong>💭 Reflection:</strong> Deep learning comes from honest review. Be specific about what you&apos;ll do differently next time.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modern Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {tradeId ? "Editing existing trade" : "Creating new trade entry"}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition shadow-md"
            >
              {tradeId ? '✏️ Update Trade' : '💾 Save Trade'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </div>
  );
}
