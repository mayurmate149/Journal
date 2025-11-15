import { Trade } from "../types/trade";

const STORAGE_KEY = "trades";

export const getTrades = (): Trade[] => {
  if (typeof window === "undefined") return []; // prevent SSR issues
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
};

export const saveTrade = (trade: Trade) => {
  if (typeof window === "undefined") return; // prevent SSR issues
  const trades = getTrades();
  trades.unshift(trade); // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
};
