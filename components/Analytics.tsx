/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { TradeAnalytics } from "@/types/analytics";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  isHealthy?: boolean;
  interpretation?: string;
}

function MetricCard({ label, value, unit, isHealthy, interpretation }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            {unit && <span className="text-lg ml-1">{unit}</span>}
          </p>
          {interpretation && (
            <p className="text-xs text-gray-500 mt-2">{interpretation}</p>
          )}
        </div>
        {isHealthy !== undefined && (
          <div className="ml-4">
            {isHealthy ? (
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            ) : (
              <div className="w-6 h-6 text-yellow-500">⚠️</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<TradeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/analytics");
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const data = await response.json();
        setAnalytics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading analytics: {error || "Unknown error"}
      </div>
    );
  }

  // Prepare data for charts
  const winLossData = [
    { name: "Wins", value: analytics.winTrades, fill: "#4ade80" },
    { name: "Losses", value: analytics.lossTrades, fill: "#f87171" },
  ];

  const strategyData = analytics.strategyPerformance.map((s) => ({
    name: s.strategy,
    profitFactor: s.profitFactor,
    trades: s.totalTrades,
    profit: s.totalProfit,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trade Analytics</h1>
          <p className="text-gray-600 mt-2">Quality of Execution Metrics</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">
            ₹{analytics.netProfit.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-gray-600">Net Profit</p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Trades"
          value={analytics.totalTrades}
          interpretation="Volume of trades executed"
        />
        <MetricCard
          label="Win Rate"
          value={analytics.winPercentage.toFixed(1)}
          unit="%"
          interpretation={`${analytics.winTrades} wins, ${analytics.lossTrades} losses`}
        />
        <MetricCard
          label="ROI"
          value={analytics.roi.toFixed(2)}
          unit="%"
          isHealthy={analytics.roi > 5}
          interpretation={`On ₹${analytics.capitalDeployed.toLocaleString("en-IN")} capital`}
        />
        <MetricCard
          label="Profit Factor"
          value={analytics.profitFactor.toFixed(2)}
          isHealthy={analytics.profitFactor > 1.5}
          interpretation={analytics.profitFactor > 1.5 ? "Healthy" : "Needs improvement"}
        />
      </div>

      {/* Execution Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Avg Profit / Trade"
          value={analytics.averageProfitPerTrade.toFixed(2)}
          unit="₹"
          interpretation="Shows edge strength"
        />
        <MetricCard
          label="Avg Loss / Trade"
          value={analytics.averageLossPerTrade.toFixed(2)}
          unit="₹"
          interpretation="Helps with risk control"
        />
        <MetricCard
          label="Reward-to-Risk Ratio"
          value={analytics.rewardToRiskRatio.toFixed(2)}
          isHealthy={analytics.rewardToRiskRatio > 1.5}
          interpretation="You can improve this"
        />
        <MetricCard
          label="Expectancy / Trade"
          value={analytics.expectancyPerTrade.toFixed(2)}
          unit="₹"
          interpretation="Predicts per-trade edge"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Gross Profit"
          value={analytics.grossProfit.toFixed(2)}
          unit="₹"
        />
        <MetricCard
          label="Gross Loss"
          value={analytics.grossLoss.toFixed(2)}
          unit="₹"
        />
        <MetricCard
          label="ROI Consistency (Std Dev)"
          value={analytics.stdDevROI.toFixed(2)}
          isHealthy={analytics.stdDevROI < 20}
          interpretation={analytics.stdDevROI < 20 ? "Low = Stable" : "High = Variable"}
        />
      </div>

      {/* Best Strategy */}
      {analytics.bestStrategy && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Best Strategy Setup
          </h3>
          <p className="text-2xl font-bold text-blue-600">
            {analytics.bestStrategy}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Manual tag analysis recommended
          </p>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Win vs Loss Distribution
          </h3>
          {analytics.totalTrades > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.name}: ${((entry.value / analytics.totalTrades) * 100).toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No trades yet
            </div>
          )}
        </div>

        {/* Strategy Performance Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Strategy Performance (Profit Factor)
          </h3>
          {strategyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="profitFactor" fill="#3b82f6" name="Profit Factor" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No strategy data available
            </div>
          )}
        </div>
      </div>

      {/* Strategy Performance Table */}
      {strategyData.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Strategy Performance Details
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Strategy
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Total Trades
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Win Trades
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Profit Factor
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Total Profit
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Avg Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.strategyPerformance.map((strategy, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {strategy.strategy}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {strategy.totalTrades}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {strategy.winTrades}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          strategy.profitFactor > 1.5
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {strategy.profitFactor.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">
                      ₹{strategy.totalProfit.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ₹{strategy.averageProfit.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metrics Explanation */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Metrics Explanation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-900">Profit Factor</p>
            <p className="text-gray-600">{`> 1.5 is considered healthy. It's Gross Profit ÷ Gross Loss`}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Reward-to-Risk Ratio</p>
            <p className="text-gray-600">
              Avg Profit ÷ Avg Loss. Higher is better.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Expectancy / Trade</p>
            <p className="text-gray-600">
              (Win% × Avg Profit) – (Loss% × Avg Loss). Your statistical edge per trade.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">ROI Consistency</p>
            <p className="text-gray-600">
              Standard deviation of ROI. Lower values indicate a more stable strategy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
