"use client";

import { useEffect, useState } from "react";
import { Trade } from "@/types/trade";

interface EmotionalMetrics {
  emotionCounts: Record<string, number>;
  averageConfidence: number;
  disciplineDistribution: Record<string, number>;
  greedPatterns: Record<string, number>;
  mindsetDistribution: Record<string, number>;
}

interface PsychologyScore {
  score: number;
  grade: string;
  trend: "improving" | "declining" | "stable";
}

interface TradeCorrelation {
  metric: string;
  winRate: number;
  avgPnL: number;
  advice: string;
}

interface DisciplineNotification {
  id: string;
  type: "warning" | "success" | "reminder" | "alert";
  title: string;
  message: string;
  timestamp: Date;
  actionable: boolean;
}

export default function PsychologyAnalytics() {
  const [metrics, setMetrics] = useState<EmotionalMetrics | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [psychologyScore, setPsychologyScore] = useState<PsychologyScore | null>(null);
  const [correlations, setCorrelations] = useState<TradeCorrelation[]>([]);
  const [notifications, setNotifications] = useState<DisciplineNotification[]>([]);

  useEffect(() => {
    const fetchAllTrades = async () => {
      try {
        const res = await fetch("/api/trades?limit=1000&status=ALL");
        if (res.ok) {
          const data = await res.json();
          const allTrades = data.data || [];
          setTrades(allTrades);
          calculateMetrics(allTrades);
          calculatePsychologyScore(allTrades);
          analyzeCorrelations(allTrades);
          generateDisciplineNotifications(allTrades);
        }
      } catch (err) {
        console.error("Failed to fetch trades:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateDisciplineNotifications = (tradeList: Trade[]) => {
    const newNotifications: DisciplineNotification[] = [];
    const recentTrades = tradeList.slice(-10); // Last 10 trades

    // Check for consecutive high-greed trades
    const recentGreedyTrades = recentTrades.filter(
      t => t.greed_indicator === "High" || t.greed_indicator === "Extreme"
    ).length;
    if (recentGreedyTrades >= 3) {
      newNotifications.push({
        id: "greed-alert",
        type: "alert",
        title: "⚠️ Greed Pattern Detected!",
        message: `${recentGreedyTrades} of your last 10 trades show high greed. This correlates with ${correlations.find(c => c.metric.includes("Greed") && c.metric.includes("High"))?.winRate.toFixed(1) || "lower"}% win rate.`,
        timestamp: new Date(),
        actionable: true
      });
    }

    // Check for emotional state underperformance
    const topPerformers = correlations.filter(c => c.winRate > 60).map(c => c.metric);
    const recentBadStates = recentTrades.filter(
      t => t.emotional_state_entry && !topPerformers.some(p => p.includes(t.emotional_state_entry!))
    ).length;
    if (recentBadStates >= 4) {
      newNotifications.push({
        id: "emotional-state-alert",
        type: "warning",
        title: "🎯 Trading in Wrong Emotional State",
        message: `You&apos;ve traded in underperforming emotional states in ${recentBadStates} recent trades. Stick to: ${topPerformers.slice(0, 2).map(p => p.split(": ")[1]).join(", ")}.`,
        timestamp: new Date(),
        actionable: true
      });
    }

    // Positive reinforcement for discipline
    const disciplinedWins = recentTrades.filter(
      t => (t.discipline_level === "Very High" || t.discipline_level === "High") &&
           ((t.profit_booked || 0) - (t.loss_booked || 0) > 0)
    ).length;
    if (disciplinedWins >= 3) {
      newNotifications.push({
        id: "discipline-success",
        type: "success",
        title: "✨ Discipline Paying Off!",
        message: `${disciplinedWins} of your recent disciplined trades were winners. Keep this up!`,
        timestamp: new Date(),
        actionable: false
      });
    }

    // Check for FOMO trades
    const fomoTrades = recentTrades.filter(
      t => t.fomo_fear === "High" || t.fomo_fear === "Extreme"
    ).length;
    if (fomoTrades >= 2) {
      newNotifications.push({
        id: "fomo-alert",
        type: "alert",
        title: "😰 FOMO Trading Detected",
        message: `${fomoTrades} recent trades driven by FOMO. Remind yourself: Wait for YOUR setup, not market&apos;s urgency.`,
        timestamp: new Date(),
        actionable: true
      });
    }

    // Daily discipline reminder
    if (recentTrades.length > 0) {
      newNotifications.push({
        id: "daily-reminder",
        type: "reminder",
        title: "💪 Daily Discipline Reminder",
        message: "Today, focus only on trades with Discipline=&quot;Very High&quot; and Confidence&gt;7. Quality over quantity!",
        timestamp: new Date(),
        actionable: false
      });
    }

    setNotifications(newNotifications);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const calculatePsychologyScore = (tradeList: Trade[]) => {
    let score = 50; // Base score
    
    // 1. Consistency (±15 points)
    const confidenceLevels = tradeList
      .filter(t => t.confidence_level)
      .map(t => t.confidence_level as number);
    if (confidenceLevels.length > 0) {
      const avgConfidence = confidenceLevels.reduce((a, b) => (a || 0) + (b || 0), 0) / confidenceLevels.length;
      score += Math.min(15, (avgConfidence / 10) * 15); // Reward high confidence
    }

    // 2. Discipline (±20 points)
    const highDiscipline = tradeList.filter(
      t => t.discipline_level === "Very High" || t.discipline_level === "High"
    ).length;
    const disciplineRatio = highDiscipline / Math.max(tradeList.length, 1);
    score += disciplineRatio * 20;

    // 3. Emotional Control (±15 points)
    const greedCount = tradeList.filter(
      t => t.greed_indicator === "High" || t.greed_indicator === "Extreme"
    ).length;
    const greedRatio = greedCount / Math.max(tradeList.length, 1);
    score -= greedRatio * 15;

    // 4. FOMO/Fear Control (±15 points)
    const fomo = tradeList.filter(t => t.fomo_fear === "High" || t.fomo_fear === "Extreme").length;
    const fomoRatio = fomo / Math.max(tradeList.length, 1);
    score -= fomoRatio * 15;

    // 5. Win Rate Consistency (±20 points - bonus for positive edge)
    const winningTrades = tradeList.filter(
      t => ((t.profit_booked || 0) - (t.loss_booked || 0)) > 0
    ).length;
    const winRate = winningTrades / Math.max(tradeList.length, 1);
    if (winRate > 0.55) score += 20; // Winning trader bonus
    else if (winRate > 0.50) score += 10;

    const grade = score >= 80 ? "A+" : score >= 70 ? "A" : score >= 60 ? "B" : score >= 50 ? "C" : "D";
    const trend = disciplineRatio > 0.6 ? "improving" : disciplineRatio < 0.4 ? "declining" : "stable";

    setPsychologyScore({
      score: Math.round(score),
      grade,
      trend,
    });
  };

  const analyzeCorrelations = (tradeList: Trade[]) => {
    const correlationData: TradeCorrelation[] = [];

    // Analyze each psychological state's impact on performance
    const emotionalStates = new Map<string, { wins: number; losses: number; pnl: number[] }>();
    const disciplineLevels = new Map<string, { wins: number; losses: number; pnl: number[] }>();
    const greedLevels = new Map<string, { wins: number; losses: number; pnl: number[] }>();
    const mindsets = new Map<string, { wins: number; losses: number; pnl: number[] }>();

    tradeList.forEach(trade => {
      const pnl = (trade.profit_booked || 0) - (trade.loss_booked || 0);
      const isWin = pnl > 0;

      // Emotional State Analysis
      if (trade.emotional_state_entry) {
        const state = trade.emotional_state_entry;
        if (!emotionalStates.has(state)) {
          emotionalStates.set(state, { wins: 0, losses: 0, pnl: [] });
        }
        const data = emotionalStates.get(state)!;
        if (isWin) data.wins++;
        else data.losses++;
        data.pnl.push(pnl);
      }

      // Discipline Level Analysis
      if (trade.discipline_level) {
        const level = trade.discipline_level;
        if (!disciplineLevels.has(level)) {
          disciplineLevels.set(level, { wins: 0, losses: 0, pnl: [] });
        }
        const data = disciplineLevels.get(level)!;
        if (isWin) data.wins++;
        else data.losses++;
        data.pnl.push(pnl);
      }

      // Greed Analysis
      if (trade.greed_indicator) {
        const greed = trade.greed_indicator;
        if (!greedLevels.has(greed)) {
          greedLevels.set(greed, { wins: 0, losses: 0, pnl: [] });
        }
        const data = greedLevels.get(greed)!;
        if (isWin) data.wins++;
        else data.losses++;
        data.pnl.push(pnl);
      }

      // Mindset Analysis
      if (trade.pre_trade_mindset) {
        const mindset = trade.pre_trade_mindset;
        if (!mindsets.has(mindset)) {
          mindsets.set(mindset, { wins: 0, losses: 0, pnl: [] });
        }
        const data = mindsets.get(mindset)!;
        if (isWin) data.wins++;
        else data.losses++;
        data.pnl.push(pnl);
      }
    });

    // Build correlation array
    emotionalStates.forEach((data, state) => {
      const total = data.wins + data.losses;
      if (total > 2) {
        const winRate = (data.wins / total) * 100;
        const avgPnL = data.pnl.reduce((a, b) => a + b, 0) / data.pnl.length;
        correlationData.push({
          metric: `Emotional State: ${state}`,
          winRate,
          avgPnL,
          advice: winRate > 55 ? "✓ Maintain this emotional state" : "⚠ Avoid this emotional state",
        });
      }
    });

    disciplineLevels.forEach((data, level) => {
      const total = data.wins + data.losses;
      if (total > 2) {
        const winRate = (data.wins / total) * 100;
        const avgPnL = data.pnl.reduce((a, b) => a + b, 0) / data.pnl.length;
        correlationData.push({
          metric: `Discipline: ${level}`,
          winRate,
          avgPnL,
          advice: winRate > 55 ? "✓ This discipline level works" : "⚠ Increase discipline",
        });
      }
    });

    greedLevels.forEach((data, greed) => {
      const total = data.wins + data.losses;
      if (total > 2) {
        const winRate = (data.wins / total) * 100;
        const avgPnL = data.pnl.reduce((a, b) => a + b, 0) / data.pnl.length;
        correlationData.push({
          metric: `Greed Level: ${greed}`,
          winRate,
          avgPnL,
          advice: greed === "None" || greed === "Slight" ? "✓ Good greed control" : "⚠ Control greed better",
        });
      }
    });

    mindsets.forEach((data, mindset) => {
      const total = data.wins + data.losses;
      if (total > 2) {
        const winRate = (data.wins / total) * 100;
        const avgPnL = data.pnl.reduce((a, b) => a + b, 0) / data.pnl.length;
        correlationData.push({
          metric: `Mindset: ${mindset}`,
          winRate,
          avgPnL,
          advice: winRate > 55 ? "✓ Cultivate this mindset" : "⚠ Adjust your mindset",
        });
      }
    });

    setCorrelations(correlationData.sort((a, b) => b.winRate - a.winRate));
  };

  const calculateMetrics = (tradeList: Trade[]) => {
    const emotionCounts: Record<string, number> = {};
    const disciplineDistribution: Record<string, number> = {};
    const greedPatterns: Record<string, number> = {};
    const mindsetDistribution: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;

    tradeList.forEach((trade) => {
      // Count emotions (entry)
      if (trade.emotional_state_entry) {
        emotionCounts[trade.emotional_state_entry] =
          (emotionCounts[trade.emotional_state_entry] || 0) + 1;
      }

      // Average confidence
      if (trade.confidence_level) {
        totalConfidence += trade.confidence_level;
        confidenceCount++;
      }

      // Discipline distribution
      if (trade.discipline_level) {
        disciplineDistribution[trade.discipline_level] =
          (disciplineDistribution[trade.discipline_level] || 0) + 1;
      }

      // Greed patterns
      if (trade.greed_indicator) {
        greedPatterns[trade.greed_indicator] =
          (greedPatterns[trade.greed_indicator] || 0) + 1;
      }

      // Mindset distribution
      if (trade.pre_trade_mindset) {
        mindsetDistribution[trade.pre_trade_mindset] =
          (mindsetDistribution[trade.pre_trade_mindset] || 0) + 1;
      }
    });

    setMetrics({
      emotionCounts,
      averageConfidence:
        confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      disciplineDistribution,
      greedPatterns,
      mindsetDistribution,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-gray-500">Loading psychology analytics...</p>
      </div>
    );
  }

  if (!metrics || trades.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No trades with psychology data to analyze
        </p>
      </div>
    );
  }

  // Calculate winning trades with high discipline
  const winningTrades = trades.filter((t) => {
    const pnl = (t.profit_booked || 0) - (t.loss_booked || 0);
    return pnl > 0;
  });

  const disciplinedTrades = trades.filter(
    (t) =>
      t.discipline_level === "Very High" || t.discipline_level === "High"
  );

  const successRate =
    disciplinedTrades.length > 0
      ? (
          (disciplinedTrades.filter((t) => {
            const pnl = (t.profit_booked || 0) - (t.loss_booked || 0);
            return pnl > 0;
          }).length /
            disciplinedTrades.length) *
          100
        ).toFixed(2)
      : 0;

  // Identify improvement areas
  const improvementAreas = [];
  
  // Check greed levels
  const highGreedTrades = trades.filter(t => t.greed_indicator === "High" || t.greed_indicator === "Extreme").length;
  if ((highGreedTrades / trades.length) > 0.2) {
    improvementAreas.push({
      area: "🤑 Greed Control",
      severity: "high",
      description: `${((highGreedTrades / trades.length) * 100).toFixed(0)}% of trades show high greed. Focus on taking profits earlier.`
    });
  }

  // Check FOMO/Fear
  const fomoTrades = trades.filter(t => t.fomo_fear === "High" || t.fomo_fear === "Extreme").length;
  if ((fomoTrades / trades.length) > 0.15) {
    improvementAreas.push({
      area: "😰 FOMO/Fear Management",
      severity: "high",
      description: `${((fomoTrades / trades.length) * 100).toFixed(0)}% of trades driven by FOMO. Wait for your setups.`
    });
  }

  // Check discipline
  const lowDiscipline = trades.filter(t => t.discipline_level === "Low" || t.discipline_level === "Very Low").length;
  if ((lowDiscipline / trades.length) > 0.2) {
    improvementAreas.push({
      area: "💪 Trading Discipline",
      severity: "medium",
      description: `${((lowDiscipline / trades.length) * 100).toFixed(0)}% of trades lack discipline. Enforce your rules strictly.`
    });
  }

  // Check confidence levels
  if (metrics.averageConfidence < 6) {
    improvementAreas.push({
      area: "🎯 Trade Confidence",
      severity: "medium",
      description: `Average confidence is ${metrics.averageConfidence.toFixed(1)}/10. Study your setup better before entering.`
    });
  }

  // Check low winning rate
  const winRate = (winningTrades.length / trades.length) * 100;
  if (winRate < 50) {
    improvementAreas.push({
      area: "📈 Win Rate Improvement",
      severity: "high",
      description: `Current win rate is ${winRate.toFixed(1)}%. Tighten your entry/exit criteria.`
    });
  }

  return (
    <div className="space-y-6">
      {/* Discipline Notifications Toast */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-md space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-lg p-4 shadow-lg border-l-4 animate-pulse ${
                notif.type === "alert"
                  ? "bg-red-100 border-red-500 text-red-900"
                  : notif.type === "warning"
                  ? "bg-yellow-100 border-yellow-500 text-yellow-900"
                  : notif.type === "success"
                  ? "bg-green-100 border-green-500 text-green-900"
                  : "bg-blue-100 border-blue-500 text-blue-900"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-bold">{notif.title}</p>
                <button
                  onClick={() => removeNotification(notif.id)}
                  className="text-lg font-bold opacity-50 hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
              <p className="text-sm mb-2">{notif.message}</p>
              {notif.actionable && (
                <button className="text-xs font-semibold bg-white bg-opacity-50 hover:bg-opacity-100 px-3 py-1 rounded transition">
                  Take Action
                </button>
              )}
              <p className="text-xs opacity-60 mt-2">
                {notif.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Personal Development Focus Areas */}
      {improvementAreas.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-900 mb-4">🎯 Areas to Work On (Personal Development)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {improvementAreas.map((item, idx) => (
              <div 
                key={idx} 
                className={`rounded-lg p-4 border-l-4 ${
                  item.severity === "high" 
                    ? "bg-red-100 border-red-500 text-red-900" 
                    : "bg-orange-100 border-orange-500 text-orange-900"
                }`}
              >
                <p className="font-bold mb-2">{item.area}</p>
                <p className="text-sm">{item.description}</p>
                <p className={`text-xs mt-2 font-semibold ${
                  item.severity === "high" ? "text-red-700" : "text-orange-700"
                }`}>
                  {item.severity === "high" ? "🔴 High Priority" : "🟠 Medium Priority"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Psychology Master Score - Hedge Fund Style */}
      {psychologyScore && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 text-white shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wide">Psychology Score</p>
              <div className="text-6xl font-bold mt-2">{psychologyScore.score}</div>
              <p className="text-indigo-100 mt-2">Grade: <span className="text-2xl font-bold">{psychologyScore.grade}</span></p>
            </div>
            <div className="border-l border-r border-indigo-300 pl-6 pr-6">
              <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wide mb-3">Status</p>
              <div className="space-y-2">
                <p className="text-lg">
                  {psychologyScore.trend === "improving" ? "📈 Improving" : psychologyScore.trend === "declining" ? "📉 Declining" : "→ Stable"}
                </p>
                <p className="text-indigo-200 text-sm">
                  Based on discipline patterns and emotional control
                </p>
              </div>
            </div>
            <div>
              <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wide mb-3">Interpretation</p>
              <p className="text-sm leading-relaxed">
                {psychologyScore.grade === "A+" && "Elite-level psychological control. Ready for larger capital."}
                {psychologyScore.grade === "A" && "Excellent discipline. Consistently following your system."}
                {psychologyScore.grade === "B" && "Good control with room for improvement in emotional management."}
                {psychologyScore.grade === "C" && "Moderate discipline. Focus on consistency before scaling."}
                {psychologyScore.grade === "D" && "High emotional influence. Review your risk management rules."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-semibold">Avg Confidence</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">
            {metrics.averageConfidence.toFixed(1)}/10
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Based on {trades.length} trades
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-semibold">
            Win Rate (Disciplined)
          </p>
          <p className="text-3xl font-bold text-green-900 mt-2">{successRate}%</p>
          <p className="text-xs text-green-600 mt-1">
            {disciplinedTrades.length} high-discipline trades
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600 font-semibold">
            Trades Analyzed
          </p>
          <p className="text-3xl font-bold text-purple-900 mt-2">
            {trades.length}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            With behavioral data
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-600 font-semibold">Winning Trades</p>
          <p className="text-3xl font-bold text-orange-900 mt-2">
            {winningTrades.length}
          </p>
          <p className="text-xs text-orange-600 mt-1">
            {((winningTrades.length / trades.length) * 100).toFixed(1)}% success
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotional States */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            😊 Emotional States at Entry
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.emotionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([emotion, count]) => (
                <div key={emotion} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-700">{emotion}</div>
                  <div className="flex-1 bg-blue-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                      style={{
                        width: `${(count / trades.length) * 100}%`,
                      }}
                    >
                      {count}
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm text-gray-600">
                    {((count / trades.length) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Discipline Levels */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            💪 Discipline Levels
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.disciplineDistribution)
              .sort((a, b) => {
                const order = [
                  "Very High",
                  "High",
                  "Medium",
                  "Low",
                  "Very Low",
                ];
                return order.indexOf(a[0]) - order.indexOf(b[0]);
              })
              .map(([discipline, count]) => (
                <div key={discipline} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-700">{discipline}</div>
                  <div className="flex-1 bg-green-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                      style={{
                        width: `${(count / trades.length) * 100}%`,
                      }}
                    >
                      {count}
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm text-gray-600">
                    {((count / trades.length) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Greed Patterns */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            🤑 Greed Indicators
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.greedPatterns)
              .sort((a, b) => {
                const order = ["None", "Slight", "Moderate", "High", "Extreme"];
                return order.indexOf(a[0]) - order.indexOf(b[0]);
              })
              .map(([greed, count]) => (
                <div key={greed} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-700">{greed}</div>
                  <div className="flex-1 bg-red-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                      style={{
                        width: `${(count / trades.length) * 100}%`,
                      }}
                    >
                      {count}
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm text-gray-600">
                    {((count / trades.length) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Mindset Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            🧠 Pre-Trade Mindset
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.mindsetDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([mindset, count]) => (
                <div key={mindset} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-700">{mindset}</div>
                  <div className="flex-1 bg-purple-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                      style={{
                        width: `${(count / trades.length) * 100}%`,
                      }}
                    >
                      {count}
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm text-gray-600">
                    {((count / trades.length) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Insights</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            • Your average confidence level is{" "}
            <span className="font-semibold">
              {metrics.averageConfidence.toFixed(1)}/10
            </span>
            . Focus on trading with higher conviction setups.
          </li>
          <li>
            • Trades with{" "}
            <span className="font-semibold">high discipline</span> have a{" "}
            <span className="font-semibold">{successRate}%</span> success rate.
          </li>
          <li>
            • Your most common emotional state at entry is{" "}
            <span className="font-semibold">
              {
                Object.entries(metrics.emotionCounts).sort(
                  (a, b) => b[1] - a[1]
                )[0]?.[0]
              }
            </span>
            .
          </li>
          <li>
            • Monitor your{" "}
            <span className="font-semibold">
              {
                Object.entries(metrics.greedPatterns).sort(
                  (a, b) => b[1] - a[1]
                )[0]?.[0]
              }
            </span>{" "}
            greed patterns - this appears frequently in your trades.
          </li>
        </ul>
      </div>

      {/* Data-Driven Correlation Analysis - Actionable Improvements */}
      {correlations.length > 0 && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-4">📊 Performance Correlation Analysis</h3>
            <p className="text-sm text-amber-800 mb-4">
              Based on hedge fund psychology principles, here&apos;s what actually impacts your P&amp;L. Focus on the top performers.
            </p>
            <div className="space-y-3">
              {correlations.slice(0, 8).map((corr, idx) => (
                <div key={idx} className="bg-white p-4 rounded border border-amber-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-amber-900">{corr.metric}</p>
                      <p className="text-sm text-amber-700 mt-1">{corr.advice}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${corr.winRate > 55 ? "text-green-600" : corr.winRate > 50 ? "text-blue-600" : "text-red-600"}`}>
                        {corr.winRate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-gray-600">Win Rate</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${corr.winRate > 55 ? "bg-green-500" : corr.winRate > 50 ? "bg-blue-500" : "bg-red-500"}`}
                          style={{ width: `${corr.winRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-semibold text-gray-900">Avg P&L: ₹{corr.avgPnL.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hedge Fund Style Trading Rules */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">🎯 Derived Trading Rules (Hedge Fund Principles)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded border border-green-100">
                <p className="font-semibold text-green-900 mb-2">1️⃣ Only Trade When:</p>
                <ul className="text-sm text-green-800 space-y-1">
                  {correlations.find(c => c.metric.includes("Confidence") && c.winRate > 55) && (
                    <li>✓ Confidence is high and aligned</li>
                  )}
                  {correlations.find(c => c.metric.includes("Discipline") && c.metric.includes("Very High") && c.winRate > 55) && (
                    <li>✓ Discipline = &quot;Very High&quot;</li>
                  )}
                  {correlations.find(c => c.metric.includes("Greed") && c.metric.includes("None") && c.winRate > 55) && (
                    <li>✓ Greed Level = &quot;None&quot;</li>
                  )}
                  {!correlations.find(c => c.metric.includes("Confidence") && c.winRate > 55) && (
                    <li>• Analyze more trades for confidence correlation</li>
                  )}
                </ul>
              </div>

              <div className="bg-white p-4 rounded border border-green-100">
                <p className="font-semibold text-green-900 mb-2">2️⃣ Avoid Trading When:</p>
                <ul className="text-sm text-green-800 space-y-1">
                  {correlations.find(c => c.metric.includes("FOMO") || c.metric.includes("Greed")) && (
                    <>
                      <li>✗ FOMO/Fear is High</li>
                      <li>✗ Greed is Present</li>
                    </>
                  )}
                  {correlations.find(c => c.metric.includes("Nervous") || c.metric.includes("Anxious")) && (
                    <li>✗ Emotional State = Nervous/Anxious</li>
                  )}
                  {correlations.find(c => c.metric.includes("Low") && c.metric.includes("Discipline")) && (
                    <li>✗ Discipline below Medium threshold</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Weekly Improvement Challenge */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-cyan-900 mb-3">🎯 Weekly Challenge (Inspired by Elite Traders)</h3>
            <div className="space-y-2 text-sm text-cyan-900">
              <p><span className="font-semibold">This Week:</span> Track only trades where your top performing psychological state is active. Measure the win rate difference.</p>
              <p className="mt-3"><span className="font-semibold">Example:</span> If &quot;Focused&quot; has 68% win rate, take only &quot;Focused&quot; trades this week. Document the outcome.</p>
              <p className="mt-3 bg-white p-3 rounded border border-cyan-200">
                💡 <span className="font-semibold">Ray Dalio Principle:</span> &quot;Get the process right, and the results will follow.&quot; Your top correlations ARE your best process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
