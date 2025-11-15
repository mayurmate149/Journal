import { Trade } from "@/types/trade";
import { TradeAnalytics, StrategyPerformance } from "@/types/analytics";

export function calculateTradeAnalytics(trades: Trade[]): TradeAnalytics {
  if (trades.length === 0) {
    return getEmptyAnalytics();
  }

  // Use both profit_booked/loss_booked and profitAmount/lossAmount for all calculations
  const getProfit = (t: Trade) => Number(t.profit_booked ?? t.profitAmount ?? 0);
  const getLoss = (t: Trade) => Number(t.loss_booked ?? t.lossAmount ?? 0);
  const getCapital = (t: Trade) => Number(t.capital_deployed ?? t.capitalDeployed ?? 0);

  const winTrades = trades.filter((t) => getProfit(t) > 0);
  const lossTrades = trades.filter((t) => getLoss(t) > 0);

  const totalProfit = winTrades.reduce((sum, t) => sum + getProfit(t), 0);
  const totalLoss = lossTrades.reduce((sum, t) => sum + getLoss(t), 0);
  const grossProfit = totalProfit;
  const grossLoss = totalLoss;
  const netProfit = totalProfit - totalLoss;

  const capitalDeployed = trades.reduce((sum, t) => sum + getCapital(t), 0);

  // Calculate metrics
  const totalTrades = trades.length;
  const winCount = winTrades.length;
  const lossCount = lossTrades.length;

  const averageProfitPerTrade = winCount > 0 ? totalProfit / winCount : 0;
  const averageLossPerTrade = lossCount > 0 ? totalLoss / lossCount : 0;

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const rewardToRiskRatio = averageLossPerTrade > 0 ? averageProfitPerTrade / averageLossPerTrade : 0;

  const winPercentage = (winCount / totalTrades) * 100;
  const lossPercentage = (lossCount / totalTrades) * 100;

  const expectancyPerTrade = (winPercentage / 100) * averageProfitPerTrade - (lossPercentage / 100) * averageLossPerTrade;

  const roi = capitalDeployed > 0 ? (netProfit / capitalDeployed) * 100 : 0;

  // Calculate Standard Deviation of ROI
  const stdDevROI = calculateStdDevROI(
    trades.map((t) => ({
      ...t,
      profit_booked: getProfit(t),
      loss_booked: getLoss(t),
      capital_deployed: getCapital(t),
    } as Trade)),
    roi
  );

  // Calculate strategy performance
  const strategyPerformance = calculateStrategyPerformance(
    trades.map((t) => ({
      ...t,
      profit_booked: getProfit(t),
      loss_booked: getLoss(t),
      capital_deployed: getCapital(t),
    } as Trade))
  );
  const bestStrategy = strategyPerformance[0]?.strategy || "";

  // Suggest improvement areas and highlight strengths
  const improvementAreas: string[] = [];
  const highlights: string[] = [];
  if (winPercentage < 50) improvementAreas.push("Increase win rate above 50% for better consistency.");
  else highlights.push("Good win rate! Keep maintaining your edge.");
  if (profitFactor < 1.5) improvementAreas.push("Improve profit factor above 1.5 by cutting losses or letting profits run.");
  else highlights.push("Strong profit factor! Your winners outweigh your losers.");
  if (rewardToRiskRatio < 1) improvementAreas.push("Aim for reward-to-risk ratio above 1 for positive expectancy.");
  else highlights.push("Excellent reward-to-risk ratio.");
  if (stdDevROI > 10) improvementAreas.push("Reduce ROI volatility for more stable returns.");
  else highlights.push("Stable ROI volatility.");
  if (expectancyPerTrade < 0) improvementAreas.push("Work on positive expectancy per trade.");
  else highlights.push("Positive expectancy per trade.");

  return {
    totalTrades,
    winTrades: winCount,
    lossTrades: lossCount,
    averageProfitPerTrade: roundTo(averageProfitPerTrade, 2),
    averageLossPerTrade: roundTo(averageLossPerTrade, 2),
    profitFactor: roundTo(profitFactor, 2),
    rewardToRiskRatio: roundTo(rewardToRiskRatio, 2),
    expectancyPerTrade: roundTo(expectancyPerTrade, 2),
    stdDevROI: roundTo(stdDevROI, 2),
    winPercentage: roundTo(winPercentage, 2),
    lossPercentage: roundTo(lossPercentage, 2),
    totalProfit: roundTo(totalProfit, 2),
    totalLoss: roundTo(totalLoss, 2),
    grossProfit: roundTo(grossProfit, 2),
    grossLoss: roundTo(grossLoss, 2),
    netProfit: roundTo(netProfit, 2),
    capitalDeployed: roundTo(capitalDeployed, 2),
    roi: roundTo(roi, 2),
    bestStrategy,
    strategyPerformance,
    improvementAreas,
    highlights,
  };
}

function calculateStrategyPerformance(trades: Trade[]): StrategyPerformance[] {
  const strategies = new Map<string, Trade[]>();

  trades.forEach((trade) => {
    const strategy = trade.strategy || "Unknown";
    if (!strategies.has(strategy)) {
      strategies.set(strategy, []);
    }
    strategies.get(strategy)!.push(trade);
  });

  const performance: StrategyPerformance[] = [];

  strategies.forEach((strategyTrades, strategy) => {
    const winTrades = strategyTrades.filter((t) => t.profit_booked > 0);
    const totalProfit = winTrades.reduce((sum, t) => sum + t.profit_booked, 0);
    const totalLoss = strategyTrades
      .filter((t) => t.loss_booked > 0)
      .reduce((sum, t) => sum + t.loss_booked, 0);

    const profitFactor =
      totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

    performance.push({
      strategy,
      totalTrades: strategyTrades.length,
      winTrades: winTrades.length,
      profitFactor: roundTo(profitFactor, 2),
      totalProfit: roundTo(totalProfit, 2),
      averageProfit:
        winTrades.length > 0
          ? roundTo(totalProfit / winTrades.length, 2)
          : 0,
    });
  });

  // Sort by profit factor descending
  return performance.sort((a, b) => b.profitFactor - a.profitFactor);
}

function calculateStdDevROI(trades: Trade[], averageROI: number): number {
  if (trades.length === 0) return 0;

  const roiPerTrade = trades.map((trade) => {
    const profit = (trade.profit_booked || 0) - (trade.loss_booked || 0);
    const roi =
      trade.capital_deployed > 0
        ? (profit / trade.capital_deployed) * 100
        : 0;
    return roi;
  });

  const variance =
    roiPerTrade.reduce((sum, roi) => sum + Math.pow(roi - averageROI, 2), 0) /
    roiPerTrade.length;

  return Math.sqrt(variance);
}

function getEmptyAnalytics(): TradeAnalytics {
  return {
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    averageProfitPerTrade: 0,
    averageLossPerTrade: 0,
    profitFactor: 0,
    rewardToRiskRatio: 0,
    expectancyPerTrade: 0,
    stdDevROI: 0,
    winPercentage: 0,
    lossPercentage: 0,
    totalProfit: 0,
    totalLoss: 0,
    grossProfit: 0,
    grossLoss: 0,
    netProfit: 0,
    capitalDeployed: 0,
    roi: 0,
    bestStrategy: "",
    strategyPerformance: [],
  };
}

export function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
