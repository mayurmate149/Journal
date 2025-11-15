export interface CapitalEntry {
  _id?: string;
  type: "initial" | "addition" | "withdrawal";
  amount: number;
  date: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CapitalSummary {
  initialCapital: number;
  totalAdditions: number;
  totalWithdrawals: number;
  currentCapital: number;
  maxLossPerTrade: number; // 1% of current capital
  maxProfitPerTrade: number; // 2% of current capital
  lastUpdated: string;
}
