export interface TradeAnalytics {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  averageProfitPerTrade: number;
  averageLossPerTrade: number;
  profitFactor: number;
  rewardToRiskRatio: number;
  expectancyPerTrade: number;
  stdDevROI: number;
  winPercentage: number;
  lossPercentage: number;
  totalProfit: number;
  totalLoss: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  capitalDeployed: number;
  roi: number;
  bestStrategy?: string;
  strategyPerformance: StrategyPerformance[];
  improvementAreas?: string[];
  highlights?: string[];
}

export interface StrategyPerformance {
  strategy: string;
  totalTrades: number;
  winTrades: number;
  profitFactor: number;
  totalProfit: number;
  averageProfit: number;
}

export interface TradeMetric {
  label: string;
  value: string | number;
  unit?: string;
  interpretation?: string;
  isHealthy?: boolean;
}
