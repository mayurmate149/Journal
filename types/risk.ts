export interface RiskMetric {
  label: string;
  target: string;
  current: number | string;
  unit?: string;
  status: "healthy" | "warning" | "critical";
  isTarget?: boolean;
}

export interface RiskCompliance {
  // Weekly Loss Metrics
  maxWeeklyLoss: number; // percentage
  maxWeeklyLossTarget: number;
  
  // Exposure Metrics
  openExposurePercentage: number;
  openExposureTarget: number;
  marginUsed: number;
  marginAvailable: number;
  
  // Stop Loss Discipline
  stopLossDiscipline: number; // percentage
  stopLossDisciplineTarget: number;
  tradesWithStopLoss: number;
  totalTrades: number;
  
  // Hedge Usage
  hedgeUsedPercentage: number;
  hedgeTarget: number;
  hedgedTrades: number;
  
  // Violations
  ruleViolations: number;
  violationDetails: RuleViolation[];
  
  // Capital Safety
  capitalSafetyBuffer: number;
  capitalSafetyTarget: number;
  totalCapital: number;
  availableCapital: number;
  
  // Overall Risk Score
  riskScore: number; // 0-100, higher is riskier
  complianceScore: number; // 0-100, higher is better
}

export interface RuleViolation {
  _id?: string;
  date: string;
  type: string; // e.g., "Stop Loss Not Applied", "Overexposed", etc.
  tradeId?: string;
  severity: "minor" | "major" | "critical";
  description: string;
  resolved: boolean;
}

export interface RiskMetricStatus {
  label: string;
  target: string;
  current: string;
  unit?: string;
  status: "healthy" | "warning" | "critical";
  isTarget?: boolean;
  percentage?: number;
}
