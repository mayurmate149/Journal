/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Trade } from "../types/trade";
import { confirm, successToast, errorAlert } from "./swal";

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
    exit_trigger: "Exit on 1 % rule",
    adjustment_plan: "",
    adjustment_notes: "",
    notes_learning: "",
    status: "OPEN",                            
    lots: 0,
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
    setTrade((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
    } as Trade));
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

  const strategies = ["Iron Condor", "Credit Spread", "Straddle", "Strangle", "Butterfly", "Calendar Spread"];
  const views = ["Bullish", "Bearish", "Neutral"];
  const statuses = ["OPEN", "CLOSED", "ADJUSTED"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-10">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <h2 className="text-xl font-bold mb-4">{loading ? "Loading..." : tradeId ? "Edit Trade" : "Add New Trade"}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="font-medium">Trade Entry Date</label>
            <input type="date" name="date" value={trade.date} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Symbol</label>
            <select name="symbol" value={trade.symbol} onChange={handleChange} className="border px-2 py-1 rounded w-full">
              <option value="">Select Symbol</option>
              <option value="Nifty">Nifty</option>
              <option value="Bank Nifty">Bank Nifty</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Strategy</label>
            <select name="strategy" value={trade.strategy} onChange={handleChange} className="border px-2 py-1 rounded w-full">
              <option value="">Select Strategy</option>
              {strategies.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="font-medium">View</label>
            <select name="view" value={trade.view} onChange={handleChange} className="border px-2 py-1 rounded w-full">
              <option value="">Select View</option>
              {views.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Entry Reason *</label>
            <input type="text" name="entry_reason" value={trade.entry_reason} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Entry Time *</label>
            <input type="time" name="entry_time" value={trade.entry_time} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Capital Deployed</label>
            <input type="number" name="capital_deployed" value={trade.capital_deployed} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Premium Collected</label>
            <input type="number" name="premium_gain" value={trade.premium_gain} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Lots</label>
            <input type="number" name="lots" value={trade.lots} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Profit Booked</label>
            <input type="number" name="profit_booked" value={trade.profit_booked} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Loss Booked</label>
            <input type="number" name="loss_booked" value={trade.loss_booked} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Exit Trigger *</label>
            <input type="text" name="exit_trigger" value={trade.exit_trigger} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Trade Exit Date</label>
            <input type="date" name="trade_exit_date" value={trade.trade_exit_date} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Adjustment Plan</label>
            <input type="text" name="adjustment_plan" value={trade.adjustment_plan} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Adjustment Notes</label>
            <input type="text" name="adjustment_notes" value={trade.adjustment_notes} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Notes / Learning</label>
            <input type="text" name="notes_learning" value={trade.notes_learning} onChange={handleChange} className="border px-2 py-1 rounded w-full" />
          </div>

          <div className="flex flex-col">
            <label className="font-medium">Status</label>
            <select name="status" value={trade.status} onChange={handleChange} className="border px-2 py-1 rounded w-full">
              <option value="">Select Status</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

