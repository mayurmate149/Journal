import { Trade } from "@/types/trade";
import { RiskCompliance, RuleViolation } from "@/types/risk";

const INITIAL_CAPITAL = 300000; // ₹3,00,000
const MAX_WEEKLY_LOSS_TARGET = -3; // percentage
const OPEN_EXPOSURE_TARGET = 70; // percentage
const STOP_LOSS_DISCIPLINE_TARGET = 100; // percentage
const HEDGE_TARGET = 80; // percentage
const CAPITAL_SAFETY_TARGET = 200000; // ₹2,00,000

export function calculateRiskCompliance(
  trades: Trade[],
  ruleViolations: RuleViolation[] = []
): RiskCompliance {
  if (trades.length === 0) {
    return getEmptyRiskCompliance();
  }

  // Calculate Weekly Loss
  const { maxWeeklyLoss } = calculateWeeklyMetrics(trades);

  // Calculate Stop Loss Discipline
  const { stopLossDiscipline, tradesWithStopLoss } = calculateStopLossDiscipline(trades);

  // Calculate Hedge Usage
  const { hedgeUsedPercentage, hedgedTrades } = calculateHedgeUsage(trades);

  // Calculate Open Exposure
  const { openExposurePercentage, marginUsed, marginAvailable } = calculateExposure(trades);

  // Calculate Capital Safety
  const availableCapital = INITIAL_CAPITAL - marginUsed;
  const capitalSafetyBuffer = Math.max(0, availableCapital);

  // Determine Risk Score (0-100, higher = riskier)
  const riskScore = calculateRiskScore({
    weeklyLoss: maxWeeklyLoss,
    exposure: openExposurePercentage,
    stopLossDiscipline,
    hedgeUsage: hedgeUsedPercentage,
    capitalBuffer: capitalSafetyBuffer,
  });

  // Determine Compliance Score (0-100, higher = better)
  const complianceScore = calculateComplianceScore({
    weeklyLoss: maxWeeklyLoss,
    exposure: openExposurePercentage,
    stopLossDiscipline,
    hedgeUsage: hedgeUsedPercentage,
    violations: ruleViolations.length,
  });

  return {
    maxWeeklyLoss: roundTo(maxWeeklyLoss, 2),
    maxWeeklyLossTarget: MAX_WEEKLY_LOSS_TARGET,
    openExposurePercentage: roundTo(openExposurePercentage, 2),
    openExposureTarget: OPEN_EXPOSURE_TARGET,
    marginUsed: roundTo(marginUsed, 2),
    marginAvailable: roundTo(marginAvailable, 2),
    stopLossDiscipline: roundTo(stopLossDiscipline, 2),
    stopLossDisciplineTarget: STOP_LOSS_DISCIPLINE_TARGET,
    tradesWithStopLoss,
    totalTrades: trades.length,
    hedgeUsedPercentage: roundTo(hedgeUsedPercentage, 2),
    hedgeTarget: HEDGE_TARGET,
    hedgedTrades,
    ruleViolations: ruleViolations.length,
    violationDetails: ruleViolations,
    capitalSafetyBuffer: roundTo(capitalSafetyBuffer, 2),
    capitalSafetyTarget: CAPITAL_SAFETY_TARGET,
    totalCapital: INITIAL_CAPITAL,
    availableCapital: roundTo(availableCapital, 2),
    riskScore: roundTo(riskScore, 2),
    complianceScore: roundTo(complianceScore, 2),
  };
}

function calculateWeeklyMetrics(trades: Trade[]): { maxWeeklyLoss: number } {
  // Group trades by week
  const weeklyData = new Map<string, { profit: number; loss: number }>();

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { profit: 0, loss: 0 });
    }

    const week = weeklyData.get(weekKey)!;
    week.profit += trade.profit_booked || 0;
    week.loss += trade.loss_booked || 0;
  });

  // Calculate max weekly loss percentage
  let maxWeeklyLoss = 0;
  weeklyData.forEach(({ profit, loss }) => {
    const netWeekly = profit - loss;
    const weeklyPercentage = (netWeekly / INITIAL_CAPITAL) * 100;
    if (weeklyPercentage < maxWeeklyLoss) {
      maxWeeklyLoss = weeklyPercentage;
    }
  });

  return { maxWeeklyLoss };
}

function calculateStopLossDiscipline(trades: Trade[]): {
  stopLossDiscipline: number;
  tradesWithStopLoss: number;
} {
  // Count trades with max_loss_allowed defined (indicates stop loss was set)
  const tradesWithStopLoss = trades.filter((t) => t.max_loss_allowed > 0).length;
  const stopLossDiscipline = (tradesWithStopLoss / trades.length) * 100;

  return { stopLossDiscipline, tradesWithStopLoss };
}

function calculateHedgeUsage(trades: Trade[]): {
  hedgeUsedPercentage: number;
  hedgedTrades: number;
} {
  // Trades with "condor" or hedge-related strategy are considered hedged
  const hedgedTrades = trades.filter(
    (t) =>
      t.strategy?.toLowerCase().includes("condor") ||
      t.strategy?.toLowerCase().includes("strangle") ||
      t.strategy?.toLowerCase().includes("spread")
  ).length;

  const hedgeUsedPercentage = (hedgedTrades / trades.length) * 100;

  return { hedgeUsedPercentage, hedgedTrades };
}

function calculateExposure(trades: Trade[]): {
  openExposurePercentage: number;
  marginUsed: number;
  marginAvailable: number;
} {
  // Calculate margin used by active trades (not exited)
  const activeTradesMargin = trades
    .filter((t) => t.status === "active" || !t.trade_exit_date)
    .reduce((sum, t) => sum + (t.capital_deployed || 0), 0);

  const marginUsed = activeTradesMargin;
  const marginAvailable = Math.max(0, INITIAL_CAPITAL - marginUsed);
  const openExposurePercentage = (marginUsed / INITIAL_CAPITAL) * 100;

  return { openExposurePercentage, marginUsed, marginAvailable };
}

function calculateRiskScore(metrics: {
  weeklyLoss: number;
  exposure: number;
  stopLossDiscipline: number;
  hedgeUsage: number;
  capitalBuffer: number;
}): number {
  let riskScore = 0;

  // Weekly Loss Risk (max 30 points)
  if (metrics.weeklyLoss < -3) {
    riskScore += 30;
  } else if (metrics.weeklyLoss < -1) {
    riskScore += 15;
  }

  // Exposure Risk (max 30 points)
  if (metrics.exposure > 80) {
    riskScore += 30;
  } else if (metrics.exposure > 70) {
    riskScore += 15;
  }

  // Stop Loss Discipline Risk (max 20 points)
  if (metrics.stopLossDiscipline < 80) {
    riskScore += 20;
  } else if (metrics.stopLossDiscipline < 95) {
    riskScore += 10;
  }

  // Hedge Usage Risk (max 10 points)
  if (metrics.hedgeUsage < 70) {
    riskScore += 10;
  }

  // Capital Buffer Risk (max 10 points)
  if (metrics.capitalBuffer < 100000) {
    riskScore += 10;
  } else if (metrics.capitalBuffer < 150000) {
    riskScore += 5;
  }

  return Math.min(100, riskScore);
}

function calculateComplianceScore(metrics: {
  weeklyLoss: number;
  exposure: number;
  stopLossDiscipline: number;
  hedgeUsage: number;
  violations: number;
}): number {
  let complianceScore = 100;

  // Deduct for weekly loss violations
  if (metrics.weeklyLoss < -3) {
    complianceScore -= 25;
  } else if (metrics.weeklyLoss < -1) {
    complianceScore -= 10;
  }

  // Deduct for exposure violations
  if (metrics.exposure > 80) {
    complianceScore -= 20;
  } else if (metrics.exposure > 70) {
    complianceScore -= 10;
  }

  // Deduct for stop loss discipline
  if (metrics.stopLossDiscipline < 80) {
    complianceScore -= 15;
  } else if (metrics.stopLossDiscipline < 95) {
    complianceScore -= 5;
  }

  // Deduct for low hedge usage
  if (metrics.hedgeUsage < 70) {
    complianceScore -= 10;
  }

  // Deduct for violations
  complianceScore -= metrics.violations * 5;

  return Math.max(0, complianceScore);
}

function getEmptyRiskCompliance(): RiskCompliance {
  return {
    maxWeeklyLoss: 0,
    maxWeeklyLossTarget: MAX_WEEKLY_LOSS_TARGET,
    openExposurePercentage: 0,
    openExposureTarget: OPEN_EXPOSURE_TARGET,
    marginUsed: 0,
    marginAvailable: INITIAL_CAPITAL,
    stopLossDiscipline: 0,
    stopLossDisciplineTarget: STOP_LOSS_DISCIPLINE_TARGET,
    tradesWithStopLoss: 0,
    totalTrades: 0,
    hedgeUsedPercentage: 0,
    hedgeTarget: HEDGE_TARGET,
    hedgedTrades: 0,
    ruleViolations: 0,
    violationDetails: [],
    capitalSafetyBuffer: INITIAL_CAPITAL,
    capitalSafetyTarget: CAPITAL_SAFETY_TARGET,
    totalCapital: INITIAL_CAPITAL,
    availableCapital: INITIAL_CAPITAL,
    riskScore: 0,
    complianceScore: 100,
  };
}

function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
