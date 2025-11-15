export interface GrowthProjection {
  startingCapital: number;
  currentCapital: number;
  weeklyROI: number; // percentage
  monthlyTopUp: number;
  targetCorpus: number;
  weeksPassed: number;
  projectedCorpus: number;
  timeToTargetWeeks: number;
  timeToTargetMonths?: number;
  timeToTargetYears?: number;
  compoundingGrowth: number; // from compounding only
  topUpGrowth: number; // from monthly top-ups
  totalGrowth: number; // total gain
  growthRate: number; // percentage from start
}

export interface ProjectionWeek {
  week: number;
  capital: number;
  compounding: number;
  topUp: number;
  totalGain: number;
}

export interface ScenarioSimulation {
  roiPercentage: number;
  weekToTarget: number;
  monthToTarget?: number;
  yearToTarget?: number;
  projectedCorpus: number;
  finalAmount: number;
}

export interface CapitalHistory {
  date: string;
  capital: number;
  type: "compounding" | "topup" | "trading";
}

export interface GrowthMetrics {
  startingCapital: number;
  currentCapital: number;
  averageWeeklyROI: number;
  monthlyTopUp: number;
  targetCorpus: number;
  weeksSinceStart: number;
  projectionData: ProjectionWeek[];
  scenarios: ScenarioSimulation[];
}
