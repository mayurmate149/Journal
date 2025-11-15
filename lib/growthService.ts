import { Trade } from "@/types/trade";
import {
  GrowthProjection,
  ProjectionWeek,
  ScenarioSimulation,
  GrowthMetrics,
} from "@/types/growth";

const TARGET_CORPUS = 10000000; // ₹1 Crore

export function calculateGrowthProjection(
  trades: Trade[],
  startingCapital: number,
  currentCapital: number,
  monthlyTopUp: number = 70000
): GrowthProjection {
  if (trades.length === 0) {
    return getEmptyProjection(startingCapital, monthlyTopUp);
  }

  // Calculate average weekly ROI from trades
  const averageWeeklyROI = calculateAverageWeeklyROI(trades);

  // Calculate weeks passed
  const weeksPassed = calculateWeeksPassed(trades);

  // Calculate projected corpus
  const projected = calculateProjectedCorpus(
    currentCapital,
    averageWeeklyROI,
    monthlyTopUp,
    100 // project 100 weeks ahead
  );

  // Calculate compounding growth vs top-up growth
  const { compoundingGrowth, topUpGrowth } = calculateGrowthBreakdown(
    startingCapital,
    currentCapital,
    monthlyTopUp,
    weeksPassed
  );

  // Calculate time to target
  const timeToTargetWeeks = calculateTimeToTarget(
    currentCapital,
    averageWeeklyROI,
    monthlyTopUp,
    TARGET_CORPUS
  );

  const totalGrowth = currentCapital - startingCapital;
  const growthRate = (totalGrowth / startingCapital) * 100;

  return {
    startingCapital,
    currentCapital: roundTo(currentCapital, 2),
    weeklyROI: roundTo(averageWeeklyROI, 2),
    monthlyTopUp,
    targetCorpus: TARGET_CORPUS,
    weeksPassed,
    projectedCorpus: roundTo(projected, 2),
    timeToTargetWeeks: Math.max(0, timeToTargetWeeks),
    timeToTargetMonths: roundTo(
      Math.max(0, timeToTargetWeeks) / 4.33,
      1
    ),
    timeToTargetYears: roundTo(
      Math.max(0, timeToTargetWeeks) / 52,
      2
    ),
    compoundingGrowth: roundTo(compoundingGrowth, 2),
    topUpGrowth: roundTo(topUpGrowth, 2),
    totalGrowth: roundTo(totalGrowth, 2),
    growthRate: roundTo(growthRate, 2),
  };
}

export function calculateGrowthMetrics(
  trades: Trade[],
  startingCapital: number,
  currentCapital: number,
  monthlyTopUp: number = 70000
): GrowthMetrics {
  const averageWeeklyROI = calculateAverageWeeklyROI(trades);
  const weeksPassed = calculateWeeksPassed(trades);

  // Generate projection data for the next 100 weeks
  const projectionData = generateProjectionData(
    currentCapital,
    averageWeeklyROI,
    monthlyTopUp,
    100
  );

  // Generate scenarios with different ROI rates
  const scenarios = generateScenarios(
    currentCapital,
    monthlyTopUp,
    TARGET_CORPUS
  );

  return {
    startingCapital,
    currentCapital: roundTo(currentCapital, 2),
    averageWeeklyROI: roundTo(averageWeeklyROI, 2),
    monthlyTopUp,
    targetCorpus: TARGET_CORPUS,
    weeksSinceStart: weeksPassed,
    projectionData,
    scenarios,
  };
}

function calculateAverageWeeklyROI(trades: Trade[]): number {
  if (trades.length === 0) return 0;

  // Group trades by week and calculate weekly ROI
  const weeklyData = new Map<string, { profit: number; loss: number }>();

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { profit: 0, loss: 0 });
    }

    const week = weeklyData.get(weekKey)!;
    week.profit += trade.profit_booked || 0;
    week.loss += trade.loss_booked || 0;
  });

  // Calculate ROI for each week
  const initialCapital = 300000; // Base capital
  const weeklyROIs: number[] = [];

  weeklyData.forEach(({ profit, loss }) => {
    const netWeekly = profit - loss;
    const roi = (netWeekly / initialCapital) * 100;
    weeklyROIs.push(roi);
  });

  // Return average of positive ROIs only (to be conservative)
  const positiveROIs = weeklyROIs.filter((roi) => roi > 0);
  if (positiveROIs.length === 0) return 0;

  const average = positiveROIs.reduce((sum, roi) => sum + roi, 0) / positiveROIs.length;
  return Math.max(0, average); // Ensure non-negative
}

function calculateWeeksPassed(trades: Trade[]): number {
  if (trades.length === 0) return 0;

  // Find earliest trade date
  const dates = trades.map((t) => new Date(t.date).getTime());
  const earliestDate = new Date(Math.min(...dates));
  const now = new Date();

  const timeDiff = now.getTime() - earliestDate.getTime();
  const weeksPassed = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000));

  return Math.max(1, weeksPassed);
}

function calculateProjectedCorpus(
  currentCapital: number,
  weeklyROI: number,
  monthlyTopUp: number,
  weeksToProject: number
): number {
  let capital = currentCapital;

  for (let week = 0; week < weeksToProject; week++) {
    // Apply compounding
    capital = capital * (1 + weeklyROI / 100);

    // Apply top-up every 4 weeks (monthly)
    if ((week + 1) % 4 === 0) {
      capital += monthlyTopUp;
    }
  }

  return capital;
}

function calculateTimeToTarget(
  currentCapital: number,
  weeklyROI: number,
  monthlyTopUp: number,
  targetCorpus: number
): number {
  let capital = currentCapital;
  let weeks = 0;
  const maxWeeks = 500; // Safety limit

  while (capital < targetCorpus && weeks < maxWeeks) {
    // Apply compounding
    capital = capital * (1 + weeklyROI / 100);

    // Apply top-up every 4 weeks (monthly)
    if ((weeks + 1) % 4 === 0) {
      capital += monthlyTopUp;
    }

    weeks++;
  }

  return weeks < maxWeeks ? weeks : -1; // -1 means target won't be reached
}

function calculateGrowthBreakdown(
  startingCapital: number,
  currentCapital: number,
  monthlyTopUp: number,
  weeksPassed: number
): { compoundingGrowth: number; topUpGrowth: number } {
  // Total top-ups received
  const totalTopUps = Math.floor(weeksPassed / 4) * monthlyTopUp;
  const topUpGrowth = totalTopUps;

  // Remaining gain is from compounding
  const totalGain = currentCapital - startingCapital;
  const compoundingGrowth = totalGain - topUpGrowth;

  return {
    compoundingGrowth: Math.max(0, compoundingGrowth),
    topUpGrowth,
  };
}

function generateProjectionData(
  startingCapital: number,
  weeklyROI: number,
  monthlyTopUp: number,
  weeksToProject: number
): ProjectionWeek[] {
  const projections: ProjectionWeek[] = [];
  let capital = startingCapital;
  let totalGain = 0;
  let compoundingGrowth = 0;
  let topUpGrowth = 0;

  for (let week = 1; week <= weeksToProject; week++) {
    const previousCapital = capital;

    // Apply compounding
    const compoundingThisWeek = previousCapital * (weeklyROI / 100);
    capital += compoundingThisWeek;
    compoundingGrowth += compoundingThisWeek;

    // Apply top-up every 4 weeks (monthly)
    if (week % 4 === 0) {
      capital += monthlyTopUp;
      topUpGrowth += monthlyTopUp;
    }

    totalGain = capital - startingCapital;

    projections.push({
      week,
      capital: roundTo(capital, 2),
      compounding: roundTo(compoundingGrowth, 2),
      topUp: roundTo(topUpGrowth, 2),
      totalGain: roundTo(totalGain, 2),
    });
  }

  return projections;
}

function generateScenarios(
  currentCapital: number,
  monthlyTopUp: number,
  targetCorpus: number
): ScenarioSimulation[] {
  const roiRates = [0.5, 0.75, 1, 1.22, 1.5, 2, 2.5];
  const scenarios: ScenarioSimulation[] = [];

  roiRates.forEach((roi) => {
    const weeksToTarget = calculateTimeToTarget(
      currentCapital,
      roi,
      monthlyTopUp,
      targetCorpus
    );

    const projectedCorpus = calculateProjectedCorpus(
      currentCapital,
      roi,
      monthlyTopUp,
      52 // 1 year projection
    );

    scenarios.push({
      roiPercentage: roundTo(roi, 2),
      weekToTarget: weeksToTarget > 0 ? weeksToTarget : -1,
      monthToTarget:
        weeksToTarget > 0 ? roundTo(weeksToTarget / 4.33, 1) : -1,
      yearToTarget:
        weeksToTarget > 0 ? roundTo(weeksToTarget / 52, 2) : -1,
      projectedCorpus: roundTo(projectedCorpus, 2),
      finalAmount: roundTo(projectedCorpus, 2),
    });
  });

  return scenarios;
}

function getEmptyProjection(
  startingCapital: number,
  monthlyTopUp: number
): GrowthProjection {
  return {
    startingCapital,
    currentCapital: startingCapital,
    weeklyROI: 0,
    monthlyTopUp,
    targetCorpus: TARGET_CORPUS,
    weeksPassed: 0,
    projectedCorpus: startingCapital,
    timeToTargetWeeks: -1,
    timeToTargetMonths: -1,
    timeToTargetYears: -1,
    compoundingGrowth: 0,
    topUpGrowth: 0,
    totalGrowth: 0,
    growthRate: 0,
  };
}

function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Scenario calculation for custom ROI input
export function calculateCustomScenario(
  currentCapital: number,
  customROI: number,
  monthlyTopUp: number,
  targetCorpus: number
): {
  timeToTargetWeeks: number;
  projectedYear1: number;
} {
  const weeksToTarget = calculateTimeToTarget(
    currentCapital,
    customROI,
    monthlyTopUp,
    targetCorpus
  );

  const projectedYear1 = calculateProjectedCorpus(
    currentCapital,
    customROI,
    monthlyTopUp,
    52
  );

  return {
    timeToTargetWeeks: weeksToTarget > 0 ? weeksToTarget : -1,
    projectedYear1: roundTo(projectedYear1, 2),
  };
}
