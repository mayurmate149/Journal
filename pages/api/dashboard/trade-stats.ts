import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongo";

interface Trade {
  _id?: string;
  date: string;
  status: string;
  symbol?: string;
  strategy?: string;
  profitAmount?: number;
  lossAmount?: number;
  [key: string]: string | number | boolean | undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB ?? "trading";
    const db = client.db(dbName);
    const tradesCollection = db.collection<Trade>("trades");

    // Get all trades
    const allTrades = await tradesCollection.find({}).toArray();

    if (allTrades.length === 0) {
      return res.status(200).json({
        winRate: 0,
        avgWinLoss: 0,
        bestMonth: 0,
        profitFactor: 0,
        totalTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
      });
    }

    // Calculate statistics
    let totalProfit = 0;
    let totalLoss = 0;
    let winCount = 0;
    let lossCount = 0;
    const monthlyProfits: { [key: string]: number } = {};
    const strategyStats: { [key: string]: { wins: number; losses: number; profit: number; loss: number } } = {};
    const symbolStats: { [key: string]: { wins: number; losses: number; profit: number; loss: number } } = {};
    let currentStreak = 0;
    let maxConsecutiveWins = 0;
    let maxLoss = 0;
    const winLosses: number[] = [];
    const loseLosses: number[] = [];

    allTrades.forEach((trade) => {
      // Prefer profit_booked/loss_booked if present, else fallback to profitAmount/lossAmount
      const profit = Number(trade.profit_booked ?? trade.profitAmount ?? 0);
      const loss = Number(trade.loss_booked ?? trade.lossAmount ?? 0);
      const pnl = profit - loss;

      totalProfit += Math.max(pnl, 0);
      totalLoss += Math.abs(Math.min(pnl, 0));

      if (pnl > 0) {
        winCount++;
        currentStreak++;
        if (currentStreak > maxConsecutiveWins) {
          maxConsecutiveWins = currentStreak;
        }
        winLosses.push(pnl);
      } else if (pnl < 0) {
        lossCount++;
        currentStreak = 0;
        loseLosses.push(Math.abs(pnl));
        maxLoss = Math.min(maxLoss, pnl);
      }

      // Group by month
      const date = new Date(trade.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyProfits[monthKey] = (monthlyProfits[monthKey] || 0) + pnl;

      // Track strategy performance
      const strategy = trade.strategy || "Unknown";
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { wins: 0, losses: 0, profit: 0, loss: 0 };
      }
      if (pnl > 0) {
        strategyStats[strategy].wins++;
        strategyStats[strategy].profit += pnl;
      } else if (pnl < 0) {
        strategyStats[strategy].losses++;
        strategyStats[strategy].loss += Math.abs(pnl);
      }

      // Track symbol performance
      const symbol = trade.symbol || "Unknown";
      if (!symbolStats[symbol]) {
        symbolStats[symbol] = { wins: 0, losses: 0, profit: 0, loss: 0 };
      }
      if (pnl > 0) {
        symbolStats[symbol].wins++;
        symbolStats[symbol].profit += pnl;
      } else if (pnl < 0) {
        symbolStats[symbol].losses++;
        symbolStats[symbol].loss += Math.abs(pnl);
      }
    });

    const totalTrades = winCount + lossCount;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const avgWin = winCount > 0 ? totalProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;
    const avgWinLoss = avgLoss > 0 ? avgWin / avgLoss : 0;
    const bestMonth = Math.max(...Object.values(monthlyProfits), 0);
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    const netProfit = totalProfit - totalLoss;
    
    // Weekly and Monthly ROI Calculations
    const INITIAL_CAPITAL = 300000;
    const weeklyProfits: { [key: string]: number } = {};
    const dailyProfits: { [key: string]: number } = {};
    
    allTrades.forEach((trade) => {
      const profit = Number(trade.profit_booked ?? trade.profitAmount ?? 0);
      const loss = Number(trade.loss_booked ?? trade.lossAmount ?? 0);
      const pnl = profit - loss;
      
      // Group by week (ISO week)
      const date = new Date(trade.date);
      const weekKey = `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, "0")}`;
      weeklyProfits[weekKey] = (weeklyProfits[weekKey] || 0) + pnl;
      
      // Group by day
      const dayKey = date.toISOString().split('T')[0];
      dailyProfits[dayKey] = (dailyProfits[dayKey] || 0) + pnl;
    });

    // Calculate average ROI metrics
    const monthlyROIs = Object.values(monthlyProfits).map(profit => (profit / INITIAL_CAPITAL) * 100);
    const weeklyROIs = Object.values(weeklyProfits).map(profit => (profit / INITIAL_CAPITAL) * 100);

    const avgMonthlyROI = monthlyROIs.length > 0 ? monthlyROIs.reduce((a, b) => a + b, 0) / monthlyROIs.length : 0;
    const avgWeeklyROI = weeklyROIs.length > 0 ? weeklyROIs.reduce((a, b) => a + b, 0) / weeklyROIs.length : 0;

    // Calculate months/weeks traded
    const monthsTraded = Object.keys(monthlyProfits).length;

    // Volatility & Risk Metrics
    const monthlyROIVariance = monthlyROIs.length > 0 
      ? monthlyROIs.reduce((sum, roi) => sum + Math.pow(roi - avgMonthlyROI, 2), 0) / monthlyROIs.length 
      : 0;
    const monthlyROIStdDev = Math.sqrt(monthlyROIVariance);

    // Sharpe Ratio (assuming 0% risk-free rate)
    const sharpeRatio = monthlyROIStdDev > 0 ? avgMonthlyROI / monthlyROIStdDev : 0;

    // Calmar Ratio and Recovery factor (annual return / max drawdown)
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let runningMax = 0;
    let runningPnl = 0;
    allTrades.forEach((trade) => {
      const profit = Number(trade.profit_booked ?? trade.profitAmount ?? 0);
      const loss = Number(trade.loss_booked ?? trade.lossAmount ?? 0);
      const pnl = profit - loss;
      runningPnl += pnl;
      runningMax = Math.max(runningMax, runningPnl);
      const drawdown = runningMax - runningPnl;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdown);
    });
    const annualizedReturn = avgMonthlyROI * 12;
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / (maxDrawdownPercent / INITIAL_CAPITAL) : 0;
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;

    // Sortino Ratio (only downside volatility)
    const downMonthlyROIs = monthlyROIs.filter(roi => roi < 0);
    const downMonthlyROIVariance = downMonthlyROIs.length > 0
      ? downMonthlyROIs.reduce((sum, roi) => sum + Math.pow(roi, 2), 0) / downMonthlyROIs.length
      : 0;
    const downMonthlyROIStdDev = Math.sqrt(downMonthlyROIVariance);
    const sortinoRatio = downMonthlyROIStdDev > 0 ? avgMonthlyROI / downMonthlyROIStdDev : 0;

    // Risk-Reward Ratio
    const profitableMonths = monthlyROIs.filter(roi => roi > 0).length;
    const monthWinRate = monthsTraded > 0 ? (profitableMonths / monthsTraded) * 100 : 0;

    // Expectancy (average profit per trade)
    const expectancy = totalTrades > 0 ? netProfit / totalTrades : 0;
    
    // Find best and worst strategy
    let bestStrategy = { name: "N/A", winRate: 0, profit: 0 };
    let worstStrategy = { name: "N/A", winRate: 100, profit: 0 };
    
    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      const stWinRate = (stats.wins / (stats.wins + stats.losses)) * 100 || 0;
      const stProfit = stats.profit - stats.loss;
      if (stProfit > bestStrategy.profit) {
        bestStrategy = { name: strategy, winRate: stWinRate, profit: stProfit };
      }
      if (stProfit < worstStrategy.profit) {
        worstStrategy = { name: strategy, winRate: stWinRate, profit: stProfit };
      }
    });

    return res.status(200).json({
      winRate: Math.round(winRate * 10) / 10,
      avgWinLoss: Math.round(avgWinLoss * 100) / 100,
      avgWin: Math.round(avgWin),
      avgLoss: Math.round(avgLoss),
      bestMonth: Math.round(bestMonth),
      profitFactor: Math.round(profitFactor * 100) / 100,
      totalTrades,
      totalProfit: Math.round(totalProfit),
      totalLoss: Math.round(totalLoss),
      netProfit: Math.round(netProfit),
      maxConsecutiveWins,
      medianWin: Math.round(winLosses.length > 0 ? winLosses.sort((a, b) => a - b)[Math.floor(winLosses.length / 2)] : 0),
      medianLoss: Math.round(loseLosses.length > 0 ? loseLosses.sort((a, b) => a - b)[Math.floor(loseLosses.length / 2)] : 0),
      largestWin: Math.round(Math.max(...winLosses, 0)),
      largestLoss: Math.round(Math.min(...loseLosses.map(l => -l), 0)),
      maxDrawdown: Math.round(maxDrawdown),
      recoveryFactor: Math.round(recoveryFactor * 100) / 100,
      
      // ROI Metrics
      avgMonthlyROI: Math.round(avgMonthlyROI * 100) / 100,
      avgWeeklyROI: Math.round(avgWeeklyROI * 100) / 100,
      monthsTraded,
      maxMonthlyROI: Math.round(Math.max(...monthlyROIs, 0) * 100) / 100,
      minMonthlyROI: Math.round(Math.min(...monthlyROIs, 0) * 100) / 100,
      maxWeeklyROI: Math.round(Math.max(...weeklyROIs, 0) * 100) / 100,
      minWeeklyROI: Math.round(Math.min(...weeklyROIs, 0) * 100) / 100,
      
      // Risk-Adjusted Returns
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      
      // Additional Metrics
      monthWinRate: Math.round(monthWinRate * 10) / 10,
      expectancy: Math.round(expectancy),
      monthlyROIStdDev: Math.round(monthlyROIStdDev * 100) / 100,
      
      // Strategy Analysis
      bestStrategy: bestStrategy.name !== "N/A" ? {
        name: bestStrategy.name,
        winRate: Math.round(bestStrategy.winRate * 10) / 10,
        profit: Math.round(bestStrategy.profit),
      } : null,
      worstStrategy: worstStrategy.name !== "N/A" ? {
        name: worstStrategy.name,
        winRate: Math.round(worstStrategy.winRate * 10) / 10,
        profit: Math.round(worstStrategy.profit),
      } : null,
    });
  } catch (error) {
    console.error("Error calculating trade statistics:", error);
    return res.status(500).json({
      message: "Error calculating trade statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
