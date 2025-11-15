export interface TradeLeg {
  type: "CE" | "PE" | "";
  strike_price: number;
  position: "BUY" | "SELL" | "";
  quantity: number;
  premium: number;
}

export interface Trade {
  _id?: string;  // Add this
  date: string;
  trade_exit_date?: string;
  symbol: string;
  strategy: string;
  view: string;
  entry_reason: string;
  entry_time: string;
  capital_deployed: number;
  premium_gain: number;
  expected_profit: number;
  max_loss_allowed: number;
  max_profit?: number;
  profit_booked: number;
  loss_booked: number;
  exit_trigger: string;
  adjustment_plan: string;
  adjustment_notes: string;
  notes_learning: string;
  status: string;
  lots: number;
  
  // Behavioral & Psychology Tracker
  pre_trade_mindset?: string;
  emotional_state_entry?: string;
  confidence_level?: number;
  fomo_fear?: string;
  greed_indicator?: string;
  discipline_level?: string;
  trade_setup_conviction?: string;
  emotional_state_exit?: string;
  behavioral_notes?: string;

  // Compatibility for analytics
  profitAmount?: number;
  lossAmount?: number;
  capitalDeployed?: number;
}
