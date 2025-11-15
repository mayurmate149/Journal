"use client";

import { fetchCapitalSummary } from "@/lib/fetchCapitalSummary";
import type { CapitalSummary } from "@/types/capital";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Analytics from "@/components/Analytics";
import RiskCompliance from "@/components/RiskCompliance";
import ProjectionPanel from "@/components/ProjectionPanel";
import PsychologyAnalytics from "@/components/PsychologyAnalytics";
import MonthlySummary from "@/components/MonthlySummary";

interface DashboardData {
  year: number;
  month: number;
  profit: number;
  loss: number;
  totalEarn: number;
  winCount: number;
  lossCount: number;
  capitalDeployed: number;
}

type TabType = "overview" | "analytics" | "risk" | "growth" | "psychology" | "portfolio";

const INITIAL_CAPITAL = 300000;

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  subtext?: string;
  highlight?: boolean;
}

function StatCard({ title, value, unit, icon, trend, subtext, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-lg shadow p-4 ${
        highlight
          ? "bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300"
          : "bg-white border border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${highlight ? "text-green-700" : "text-gray-900"}`}>
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            {unit && <span className="text-lg ml-1">{unit}</span>}
          </p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        {trend && (
          <div className={`text-2xl ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-400"}`}>
            {trend === "up" ? "📈" : trend === "down" ? "📉" : "→"}
          </div>
        )}
        {icon && <div className="text-3xl">{icon}</div>}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-600 bg-blue-50"
          : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}


export default function DashboardPage() {
  // Capital summary for 1%/2% cards
  const [capitalSummary, setCapitalSummary] = useState<CapitalSummary | null>(null);
  const [capitalLoading, setCapitalLoading] = useState(true);

  useEffect(() => {
    fetchCapitalSummary().then((summary) => {
      setCapitalSummary(summary);
      setCapitalLoading(false);
    });
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [data, setData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const months = useMemo(() => {
    const sorted = data
      .map((r) => ({
        ...r,
        year: Number(r.year),
        month: Number(r.month),
        profit: Number(r.profit ?? 0),
        loss: Number(r.loss ?? 0),
        totalEarn: Number(r.totalEarn ?? 0),
        winCount: Number(r.winCount ?? 0),
        lossCount: Number(r.lossCount ?? 0),
        capitalDeployed: Number(r.capitalDeployed ?? 0),
        totalTrades: Number(r.winCount ?? 0) + Number(r.lossCount ?? 0),
      }))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    let runningBalance = INITIAL_CAPITAL;
    return sorted.map((m) => {
      const roi = runningBalance ? (m.totalEarn / runningBalance) * 100 : 0;
      runningBalance += m.totalEarn;
      return { ...m, roi, balance: runningBalance };
    });
  }, [data]);

  const stats = useMemo(() => {
    const totalTrades = months.reduce((sum, m) => sum + m.totalTrades, 0);
    const totalWins = months.reduce((sum, m) => sum + m.winCount, 0);
    const totalLosses = months.reduce((sum, m) => sum + m.lossCount, 0);
    const totalProfit = months.reduce((sum, m) => sum + m.profit, 0);
    const totalLoss = months.reduce((sum, m) => sum + m.loss, 0);
    const netProfit = totalProfit - totalLoss;
    const finalBalance = months[months.length - 1]?.balance ?? INITIAL_CAPITAL;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

    return {
      totalTrades,
      totalWins,
      totalLosses,
      totalProfit,
      totalLoss,
      netProfit,
      finalBalance,
      winRate,
    };
  }, [months]);

  const [recentTrades, setRecentTrades] = useState<Array<{
    date: string;
    symbol: string;
    strategy: string;
    pnl: number;
    isWin: boolean;
  }>>([]);

  interface StrategyStats {
    name: string;
    winRate: number;
    profit: number;
  }

  const [tradeStats, setTradeStats] = useState<{
    winRate: number;
    avgWinLoss: number;
    avgWin: number;
    avgLoss: number;
    bestMonth: number;
    profitFactor: number;
    totalTrades: number;
    totalProfit: number;
    totalLoss: number;
    netProfit: number;
    maxConsecutiveWins: number;
    medianWin: number;
    medianLoss: number;
    largestWin: number;
    largestLoss: number;
    maxDrawdown: number;
    recoveryFactor: number;
    avgMonthlyROI: number;
    avgWeeklyROI: number;
    monthsTraded: number;
    maxMonthlyROI: number;
    minMonthlyROI: number;
    maxWeeklyROI: number;
    minWeeklyROI: number;
    sharpeRatio: number;
    calmarRatio: number;
    sortinoRatio: number;
    annualizedReturn: number;
    monthWinRate: number;
    expectancy: number;
    monthlyROIStdDev: number;
    bestStrategy: StrategyStats | null;
    worstStrategy: StrategyStats | null;
  }>({
    winRate: 0,
    avgWinLoss: 0,
    avgWin: 0,
    avgLoss: 0,
    bestMonth: 0,
    profitFactor: 0,
    totalTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    netProfit: 0,
    maxConsecutiveWins: 0,
    medianWin: 0,
    medianLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    maxDrawdown: 0,
    recoveryFactor: 0,
    avgMonthlyROI: 0,
    avgWeeklyROI: 0,
    monthsTraded: 0,
    maxMonthlyROI: 0,
    minMonthlyROI: 0,
    maxWeeklyROI: 0,
    minWeeklyROI: 0,
    sharpeRatio: 0,
    calmarRatio: 0,
    sortinoRatio: 0,
    annualizedReturn: 0,
    monthWinRate: 0,
    expectancy: 0,
    monthlyROIStdDev: 0,
    bestStrategy: null,
    worstStrategy: null,
  });

  useEffect(() => {
    const fetchRecentTrades = async () => {
      try {
        const res = await fetch("/api/dashboard/recent-trades");
        interface TradeData {
          date: string;
          symbol: string;
          strategy: string;
          pnl: number;
          isWin: boolean;
        }
        const trades: TradeData[] = await res.json();
        setRecentTrades(
          trades.slice(0, 5).map((trade: TradeData) => ({
            date: new Date(trade.date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            symbol: trade.symbol,
            strategy: trade.strategy,
            pnl: trade.pnl,
            isWin: trade.isWin,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch recent trades:", error);
      }
    };
    fetchRecentTrades();
  }, []);

  useEffect(() => {
    const fetchTradeStats = async () => {
      try {
        const res = await fetch("/api/dashboard/trade-stats");
        const stats = await res.json();
        setTradeStats(stats);
      } catch (error) {
        console.error("Failed to fetch trade statistics:", error);
      }
    };
    fetchTradeStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time insights and portfolio analysis</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
            📊 Overview
          </TabButton>
          <TabButton active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>
            📈 Trading Analytics
          </TabButton>
          <TabButton active={activeTab === "risk"} onClick={() => setActiveTab("risk")}>
            🛡️ Risk Management
          </TabButton>
          <TabButton active={activeTab === "psychology"} onClick={() => setActiveTab("psychology")}>
            🧠 Psychology & Behavior
          </TabButton>
          <TabButton active={activeTab === "growth"} onClick={() => setActiveTab("growth")}>
            🚀 Growth Projections
          </TabButton>
          <TabButton active={activeTab === "portfolio"} onClick={() => setActiveTab("portfolio")}>
            🎯 Portfolio Planner
          </TabButton>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Quick Stats */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Quick Overview</h2>
                <button
                  onClick={fetchData}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition text-sm"
                  disabled={loading}
                  title="Refresh dashboard data"
                >
                  {loading ? (
                    <span className="animate-spin">🔄</span>
                  ) : (
                    <span>🔄</span>
                  )}
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Current Capital"
                  value={`₹${stats.finalBalance.toLocaleString("en-IN")}`}
                  icon="💰"
                  highlight={true}
                  subtext={undefined}
                />
                {capitalLoading ? (
                  <div className="col-span-2 flex items-center justify-center text-gray-400">Loading risk cards...</div>
                ) : capitalSummary ? (
                  <>
                    <div className="rounded-lg shadow p-4 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-red-700 font-medium">1% Loss Limit</p>
                          <p className="text-2xl font-bold mt-1 text-red-900">
                            ₹{capitalSummary.maxLossPerTrade.toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-red-600 mt-1">Max loss per trade (1% of capital)</p>
                        </div>
                        <div className="text-3xl">🛑</div>
                      </div>
                    </div>
                    <div className="rounded-lg shadow p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-blue-700 font-medium">2% Profit Target</p>
                          <p className="text-2xl font-bold mt-1 text-blue-900">
                            ₹{capitalSummary.maxProfitPerTrade.toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">Target profit per trade (2% of capital)</p>
                        </div>
                        <div className="text-3xl">🎯</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 flex items-center justify-center text-gray-400">No capital data</div>
                )}
                <StatCard
                  title="Total Trades"
                  value={stats.totalTrades}
                  icon="�"
                  trend="neutral"
                  subtext="Lifetime trades"
                />
              </div>
            </div>

            {/* Monthly P&L Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly P&L Trend</h3>
              {months.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={months}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={(m) => `${m.month}/${m.year}`} />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                    <Legend />
                    <Bar dataKey="profit" fill="#4ade80" name="Profit" />
                    <Bar dataKey="loss" fill="#f87171" name="Loss" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Monthly Summary Table */}
            <MonthlySummary data={data} loading={loading} />

            {/* Recent Trades & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Trades */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h3>
                <div className="space-y-3">
                  {recentTrades.length > 0 ? (
                    recentTrades.map((trade, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{trade.symbol}</p>
                          <p className="text-xs text-gray-500">{trade.date} • {trade.strategy}</p>
                        </div>
                        <p className={`font-bold ${trade.isWin ? "text-green-600" : "text-red-600"}`}>
                          {trade.isWin ? "+" : ""}₹{Math.abs(trade.pnl).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Loading recent trades...
                    </div>
                  )}
                </div>
              </div>

              {/* Progress to Target */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Milestone Progress</h3>
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => {
                    const target = (i + 1) * 500000;
                    const label = `₹${((target / 100000).toFixed(0))} Lakh`;
                    const achieved = stats.finalBalance >= target;
                    const isInProgress = !achieved && stats.finalBalance > (i === 0 ? 0 : i * 500000);
                    const progress = Math.min((stats.finalBalance / target) * 100, 100);
                    const remaining = Math.max(target - stats.finalBalance, 0);
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full ${achieved ? "bg-green-100 text-green-700" : isInProgress ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"} flex items-center justify-center font-bold`}>
                            {achieved ? "✓" : isInProgress ? "◐" : "○"}
                          </div>
                          {i < 4 && <div className="w-1 h-12 bg-gray-200 my-1"></div>}
                        </div>
                        <div className="pt-2 flex-1">
                          <p className="font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-600">
                            {achieved ? "Achieved" : isInProgress ? `In Progress • ₹${remaining.toLocaleString("en-IN")} left` : `Planned • ₹${remaining.toLocaleString("en-IN")} left`}
                          </p>
                          {isInProgress && (
                            <div className="w-full bg-gray-200 rounded h-1 mt-2">
                              <div className="bg-blue-500 h-1 rounded" style={{ width: `${progress}%` }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">📊 Key Insights & Performance Metrics</h3>
              
              {/* Core Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-blue-200">
                <div className="bg-white rounded p-4">
                  <p className="font-semibold text-gray-900 text-sm">Total Return</p>
                  <p className="text-green-600 mt-2 text-xl font-bold">
                    +{((stats.netProfit / INITIAL_CAPITAL) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">₹{stats.netProfit.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded p-4">
                  <p className="font-semibold text-gray-900 text-sm">Win/Loss Ratio</p>
                  <p className="text-blue-600 mt-2 text-xl font-bold">{tradeStats.avgWinLoss?.toFixed(2)}x</p>
                  <p className="text-xs text-gray-500 mt-1">{tradeStats.winRate?.toFixed(1)}% Win Rate</p>
                </div>
                <div className="bg-white rounded p-4">
                  <p className="font-semibold text-gray-900 text-sm">Profit Factor</p>
                  <p className="text-indigo-600 mt-2 text-xl font-bold">{tradeStats.profitFactor?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Profit / Loss Ratio</p>
                </div>
              </div>

              {/* Trading Efficiency */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 pb-6 border-b border-blue-200">
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Avg Win</p>
                  <p className="text-green-600 mt-1 font-bold">₹{tradeStats.avgWin?.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Avg Loss</p>
                  <p className="text-red-600 mt-1 font-bold">₹{tradeStats.avgLoss?.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Best Month</p>
                  <p className="text-blue-600 mt-1 font-bold">₹{tradeStats.bestMonth?.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Consecutive Wins</p>
                  <p className="text-indigo-600 mt-1 font-bold">{tradeStats.maxConsecutiveWins || 0}</p>
                </div>
              </div>

              {/* Advanced Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 pb-6 border-b border-blue-200">
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Largest Win</p>
                  <p className="text-green-600 mt-1 font-bold">₹{tradeStats.largestWin?.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Largest Loss</p>
                  <p className="text-red-600 mt-1 font-bold">₹{Math.abs(tradeStats.largestLoss || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Max Drawdown</p>
                  <p className="text-orange-600 mt-1 font-bold">₹{tradeStats.maxDrawdown?.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Recovery Factor</p>
                  <p className={`mt-1 font-bold ${(tradeStats.recoveryFactor || 0) > 1 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {tradeStats.recoveryFactor?.toFixed(2)}x
                  </p>
                </div>
              </div>

              {/* ROI Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 pb-6 border-b border-blue-200">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-xs uppercase">Avg Monthly ROI</p>
                      <p className="text-green-700 mt-2 text-xl font-bold">{tradeStats.avgMonthlyROI?.toFixed(2)}%</p>
                      <p className="text-xs text-gray-600 mt-1">Over {tradeStats.monthsTraded} months</p>
                    </div>
                    <span className="text-3xl">📈</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-xs uppercase">Avg Weekly ROI</p>
                      <p className="text-blue-700 mt-2 text-xl font-bold">{tradeStats.avgWeeklyROI?.toFixed(2)}%</p>
                      <p className="text-xs text-gray-600 mt-1">Range: {tradeStats.minWeeklyROI?.toFixed(2)}% to {tradeStats.maxWeeklyROI?.toFixed(2)}%</p>
                    </div>
                    <span className="text-3xl">📊</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-xs uppercase">Annualized Return</p>
                      <p className="text-purple-700 mt-2 text-xl font-bold">{tradeStats.annualizedReturn?.toFixed(2)}%</p>
                      <p className="text-xs text-gray-600 mt-1">Projected yearly</p>
                    </div>
                    <span className="text-3xl">🎯</span>
                  </div>
                </div>
              </div>

              {/* Risk-Adjusted Returns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 pb-6 border-b border-blue-200">
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Sharpe Ratio</p>
                  <p className={`mt-2 text-lg font-bold ${(tradeStats.sharpeRatio || 0) > 1 ? 'text-green-600' : (tradeStats.sharpeRatio || 0) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {tradeStats.sharpeRatio?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Risk-adjusted returns (higher better)</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Calmar Ratio</p>
                  <p className={`mt-2 text-lg font-bold ${(tradeStats.calmarRatio || 0) > 1 ? 'text-green-600' : (tradeStats.calmarRatio || 0) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {tradeStats.calmarRatio?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Return vs Max Drawdown</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="font-semibold text-gray-900 text-xs uppercase">Sortino Ratio</p>
                  <p className={`mt-2 text-lg font-bold ${(tradeStats.sortinoRatio || 0) > 1 ? 'text-green-600' : (tradeStats.sortinoRatio || 0) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {tradeStats.sortinoRatio?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Downside risk-adjusted</p>
                </div>
              </div>

              {/* Strategy & Risk Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900 text-sm">🏆 Best Strategy</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Top Performer</span>
                  </div>
                  {tradeStats.bestStrategy ? (
                    <div>
                      <p className="text-lg font-bold text-green-600">{tradeStats.bestStrategy.name}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-gray-600">Win Rate</p>
                          <p className="font-bold text-gray-900">{tradeStats.bestStrategy.winRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Profit</p>
                          <p className="font-bold text-green-600">₹{tradeStats.bestStrategy.profit?.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No strategy data</p>
                  )}
                </div>

                <div className="bg-white rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900 text-sm">⚠️ Needs Improvement</p>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Focus Area</span>
                  </div>
                  {tradeStats.worstStrategy ? (
                    <div>
                      <p className="text-lg font-bold text-red-600">{tradeStats.worstStrategy.name}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-gray-600">Win Rate</p>
                          <p className="font-bold text-gray-900">{tradeStats.worstStrategy.winRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Loss</p>
                          <p className="font-bold text-red-600">₹{Math.abs(tradeStats.worstStrategy.profit || 0).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No strategy data</p>
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="mt-6 pt-6 border-t border-blue-200">
                <p className="font-semibold text-gray-900 mb-3 text-sm">💡 Recommended Actions:</p>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>{tradeStats.avgWinLoss > 1.2 ? "✓ Win/Loss ratio is strong. Focus on increasing win rate." : "Improve your Win/Loss ratio - aim for 1.2x or higher"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>{tradeStats.maxDrawdown > stats.netProfit ? "⚠️ Max drawdown exceeds profits. Consider tighter risk management." : "✓ Drawdown management is good"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>{tradeStats.profitFactor > 1.5 ? "✓ Profit factor is excellent. Maintain your edge." : "Improve profit factor - focus on reducing losses"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>Replicate {tradeStats.bestStrategy?.name} success - highest profit generator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>Review and optimize {tradeStats.worstStrategy?.name} - review why it underperforms</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-fadeIn">
            <Analytics />
          </div>
        )}

        {/* RISK MANAGEMENT TAB */}
        {activeTab === "risk" && (
          <div className="space-y-8 animate-fadeIn">
            <RiskCompliance />
          </div>
        )}

        {/* PSYCHOLOGY & BEHAVIOR TAB */}
        {activeTab === "psychology" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🧠 Psychology & Behavioral Analytics</h2>
              <p className="text-gray-600 mb-6">Track emotional patterns, discipline levels, and psychological factors affecting your trades</p>
            </div>
            <PsychologyAnalytics />
          </div>
        )}

        {/* GROWTH PROJECTIONS TAB */}
        {activeTab === "growth" && (
          <div className="space-y-8 animate-fadeIn">
            <ProjectionPanel />
          </div>
        )}

        {/* PORTFOLIO PLANNER TAB */}
        {activeTab === "portfolio" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio Planner</h2>

              {/* Goals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Financial Goals</h3>
                  <div className="space-y-4">
                    {stats && [
                      { 
                        goal: "₹50 Lakhs", 
                        timeframe: "Initial Target", 
                        achieved: stats.finalBalance >= 5000000,
                        current: stats.finalBalance
                      },
                      { 
                        goal: "₹1 Crore", 
                        timeframe: "Primary Target", 
                        achieved: stats.finalBalance >= 10000000,
                        current: stats.finalBalance
                      },
                      { 
                        goal: "₹2 Crore", 
                        timeframe: "Long Term", 
                        achieved: stats.finalBalance >= 20000000,
                        current: stats.finalBalance
                      },
                      { 
                        goal: "Monthly ₹2L income", 
                        timeframe: "Income Target", 
                        achieved: (stats.netProfit / 12) >= 200000,
                        current: (stats.netProfit / 12)
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{item.goal}</p>
                          <p className="text-xs text-gray-500">{item.timeframe}</p>
                        </div>
                        <span className={`text-lg ${item.achieved ? "✅" : "⏳"}`}></span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Action Items</h3>
                  <div className="space-y-3">
                    {[
                      { title: "Improve Win Rate", desc: `Target: 55%+ (Current: ${stats.winRate.toFixed(1)}%)` },
                      { title: "Increase Position Size", desc: "Scale up after 3 months of +2% weekly ROI" },
                      { title: "Monthly Top-ups", desc: "Commit ₹70,000/month for compound growth" },
                      { title: "Weekly Review", desc: "Every Sunday - analyze trades and update strategy" },
                    ].map((item, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded border-l-4 ${["bg-blue-50 border-blue-500", "bg-yellow-50 border-yellow-500", "bg-purple-50 border-purple-500", "bg-green-50 border-green-500"][idx]}`}>
                        <input type="checkbox" className="mt-1 cursor-pointer" defaultChecked={idx === 0} />
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-600">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Milestones & Strategy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Milestones</h3>
                  <div className="space-y-3">
                    {[
                      {
                        label: "₹10 Lakhs",
                        achieved: stats.finalBalance >= 1000000,
                        target: 1000000,
                        date: "Milestone 1",
                      },
                      {
                        label: "₹25 Lakhs",
                        achieved: stats.finalBalance >= 2500000,
                        target: 2500000,
                        date: "Milestone 2",
                      },
                      {
                        label: "₹50 Lakhs",
                        achieved: stats.finalBalance >= 5000000,
                        target: 5000000,
                        date: "Milestone 3",
                      },
                      {
                        label: "₹1 Crore",
                        achieved: stats.finalBalance >= 10000000,
                        target: 10000000,
                        date: "Milestone 4",
                      },
                      {
                        label: "₹5 Crore",
                        achieved: stats.finalBalance >= 50000000,
                        target: 50000000,
                        date: "Milestone 5",
                      },
                    ].map((item, idx) => {
                      const isAchieved = item.achieved;
                      const isInProgress = !isAchieved && stats.finalBalance > 0;
                      const progress = (stats.finalBalance / item.target) * 100;
                      return (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full ${isAchieved ? "bg-green-100 text-green-700" : isInProgress ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"} flex items-center justify-center font-bold`}>
                              {isAchieved ? "✓" : isInProgress ? "◐" : "○"}
                            </div>
                            {idx < 2 && <div className="w-1 h-12 bg-gray-200 my-1"></div>}
                          </div>
                          <div className="pt-2 flex-1">
                            <p className="font-medium text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-600">{isAchieved ? "Achieved" : isInProgress ? "In Progress" : "Planned"} • {item.date}</p>
                            {isInProgress && <div className="w-full bg-gray-200 rounded h-1 mt-2"><div className="bg-blue-500 h-1 rounded" style={{ width: `${Math.min(progress, 100)}%` }}></div></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Strategy Notes</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      { title: "Current Focus", desc: "Iron Condor on NIFTY/BANKNIFTY weekly expiry", color: "orange" },
                      { title: "Risk Limit", desc: "Max 2% loss per trade, 3% loss per week", color: "purple" },
                      { title: "Capital Deployment", desc: "70% in core strategy, 30% in experimental", color: "teal" },
                    ].map((item, idx) => (
                      <div key={idx} className={`p-3 rounded border-l-4 ${item.color === "orange" ? "bg-orange-50 border-orange-400" : item.color === "purple" ? "bg-purple-50 border-purple-400" : "bg-teal-50 border-teal-400"}`}>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-gray-600 text-xs mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
