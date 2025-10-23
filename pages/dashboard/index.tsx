/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { JSX } from "react/jsx-runtime";

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

const INITIAL_CAPITAL = 300000; // ₹3,00,000
const COLORS = ["#4ade80", "#f87171"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard", { signal: controller.signal });
        const json = await res.json().catch(() => null);
        if (!res.ok)
          throw new Error(json?.message || res.statusText || `Request failed (${res.status})`);
        if (Array.isArray(json)) setData(json);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message || "Failed to fetch dashboard data");
          setData([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [refreshKey]);

  // Process months
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
        totalTrades: (Number(r.winCount ?? 0) + Number(r.lossCount ?? 0)),
      }))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    let runningBalance = INITIAL_CAPITAL;
    return sorted.map((m) => {
      const roi = runningBalance ? (m.totalEarn / runningBalance) * 100 : 0;
      runningBalance += m.totalEarn;
      return { ...m, roi, balance: runningBalance };
    });
  }, [data]);

  const predictionData = useMemo(() => {
    if (months.length < 2) return [];

    // Use simple linear regression: y = a + b * x
    const x = months.map((_, i) => i + 1);
    const y = months.map((m) => m.totalEarn);

    const n = x.length;
    const sumX = x.reduce((s, xi) => s + xi, 0);
    const sumY = y.reduce((s, yi) => s + yi, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);

    const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const a = (sumY - b * sumX) / n;

    const future = [n + 1, n + 2, n + 3].map((xi, idx) => ({
      name: new Date(months[months.length - 1].year, months[months.length - 1].month - 1 + (idx + 1))
        .toLocaleString("default", { month: "short", year: "2-digit" }),
      actual: null,
      predicted: a + b * xi,
    }));

    const actualData = months.map((m, i) => ({
      name: new Date(m.year, m.month - 1).toLocaleString("default", { month: "short", year: "2-digit" }),
      actual: m.totalEarn,
      predicted: null,
    }));

    return [...actualData, ...future];
  }, [months]);

  // Compute stats for KPIs
  const stats = useMemo(() => {
    const totalProfit = months.reduce((s, m) => s + m.profit, 0);
    const totalLoss = months.reduce((s, m) => s + m.loss, 0);
    const net = totalProfit - totalLoss;
    const latestBalance = INITIAL_CAPITAL + net;

    const totalWin = months.reduce((s, m) => s + m.winCount, 0);
    const totalLossCount = months.reduce((s, m) => s + m.lossCount, 0);
    const totalTrades = totalWin + totalLossCount;
    const avgRoi = months.length
      ? months.reduce((s, m) => s + m.roi, 0) / months.length
      : 0;

    const best = months.length
      ? months.reduce((p, c) => (c.totalEarn > p.totalEarn ? c : p), months[0])
      : null;
    const worst = months.length
      ? months.reduce((p, c) => (c.totalEarn < p.totalEarn ? c : p), months[0])
      : null;

    const winRate = totalTrades ? (totalWin / totalTrades) * 100 : 0;
    const avgProfit = totalWin ? totalProfit / totalWin : 0;
    const avgLoss = totalLossCount ? totalLoss / totalLossCount : 0;

    return {
      monthsCount: months.length,
      totalProfit,
      totalLoss,
      net,
      latestBalance,
      totalWin,
      totalLossCount,
      totalTrades,
      avgRoi,
      best,
      worst,
      winRate,
      avgProfit,
      avgLoss,
    };
  }, [months]);

  const formatMonth = (y: number, m: number) =>
    new Date(y, m - 1).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });

  const formatCurrency = (n: number) =>
    `₹${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const kpiCard = (
    label: string,
    value: string | number,
    icon?: JSX.Element,
    color?: string
  ) => (
    <div
      className={`p-5 bg-gradient-to-br rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 hover:scale-105 transition transform ${color}`}
    >
      {icon && <div className="w-8 h-8">{icon}</div>}
      <div className="text-xs text-slate-200">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mayur Trading Journal</h1>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Primary KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {kpiCard(
          "Trade Months",
          stats.monthsCount,
          <ChartBarIcon className="w-6 h-6 text-white" />,
          "from-blue-500 to-blue-700"
        )}
        {kpiCard(
          "Net P&L",
          formatCurrency(stats.net),
          stats.net >= 0 ? (
            <ArrowUpIcon className="w-6 h-6 text-white" />
          ) : (
            <ArrowDownIcon className="w-6 h-6 text-white" />
          ),
          stats.net >= 0
            ? "from-green-400 to-green-600"
            : "from-red-400 to-red-600"
        )}
        {kpiCard(
          "Latest Balance",
          formatCurrency(stats.latestBalance),
          <CurrencyRupeeIcon className="w-6 h-6 text-white" />,
          "from-purple-400 to-purple-600"
        )}
        {kpiCard(
          "Avg ROI / Month",
          `${stats.avgRoi.toFixed(2)}%`,
          <ChartBarIcon className="w-6 h-6 text-white" />,
          "from-indigo-400 to-indigo-600"
        )}
      </section>

      {/* Secondary KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCard(
          "Total Wins",
          stats.totalWin,
          <ArrowUpIcon className="w-6 h-6 text-white" />,
          "from-green-500 to-green-700"
        )}
        {kpiCard(
          "Total Losses",
          stats.totalLossCount,
          <ArrowDownIcon className="w-6 h-6 text-white" />,
          "from-red-500 to-red-700"
        )}
        {kpiCard(
          "Total Trades",
          stats.totalTrades,
          <ChartBarIcon className="w-6 h-6 text-white" />,
          "from-yellow-400 to-yellow-600"
        )}
      </section>

      {/* Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded shadow flex flex-col">
          <h4 className="text-sm font-semibold text-green-800 mb-1">Best Month</h4>
          <div className="text-lg font-bold text-green-700">
            {stats.best
              ? `${formatMonth(stats.best.year, stats.best.month)} (${formatCurrency(
                stats.best.totalEarn
              )})`
              : "—"}
          </div>
        </div>
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded shadow flex flex-col">
          <h4 className="text-sm font-semibold text-red-800 mb-1">Worst Month</h4>
          <div className="text-lg font-bold text-red-600">
            {stats.worst
              ? `${formatMonth(stats.worst.year, stats.worst.month)} (${formatCurrency(
                stats.worst.totalEarn
              )})`
              : "—"}
          </div>
        </div>
      </section>

      {/* Month-wise Table */}
      <section className="overflow-auto bg-white border rounded shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Month</th>
              <th className="p-3 text-right">Profit</th>
              <th className="p-3 text-right">Loss</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3 text-right">Wins</th>
              <th className="p-3 text-right">Losses</th>
              <th className="p-3 text-right">Total Trades</th>
              <th className="p-3 text-right">ROI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {months.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No monthly data
                </td>
              </tr>
            ) : (
              months.map((m) => {
                const n = m.totalEarn;
                const positive = n >= 0;
                return (
                  <tr key={`${m.year}-${m.month}`} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-medium">{formatMonth(m.year, m.month)}</td>
                    <td className="p-3 text-right text-green-600">
                      {formatCurrency(m.profit)}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      {formatCurrency(m.loss)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${positive ? "text-green-700" : "text-red-600"
                        }`}
                    >
                      {formatCurrency(n)}
                    </td>
                    <td className="p-3 text-right text-green-600">{m.winCount}</td>
                    <td className="p-3 text-right text-red-600">{m.lossCount}</td>
                    <td className="p-3 text-right">{m.totalTrades}</td>
                    <td className="p-3 text-right">{m.roi.toFixed(2)}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <h4 className="text-sm font-semibold mb-2">Monthly Profit vs Loss</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={(m) => formatMonth(m.year, m.month)} />
              <YAxis />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="profit" fill="#4ade80" />
              <Bar dataKey="loss" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="text-sm font-semibold mb-2">Monthly ROI (%)</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={(m) => formatMonth(m.year, m.month)} />
              <YAxis />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Line type="monotone" dataKey="roi" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="text-sm font-semibold mb-2">Wins vs Losses</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: "Wins", value: stats.totalWin },
                  { name: "Losses", value: stats.totalLossCount },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {COLORS.map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="text-sm font-semibold mb-2">Cumulative Balance</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={months.map((m, i) => {
                const cumulative =
                  INITIAL_CAPITAL +
                  months.slice(0, i + 1).reduce((s, x) => s + x.totalEarn, 0);
                return { ...m, cumulative };
              })}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={(m) => formatMonth(m.year, m.month)} />
              <YAxis />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="cumulative" stroke="#facc15" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Trade Quality Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 text-white rounded shadow">
          <div className="text-sm">Win Rate</div>
          <div className="text-xl font-bold">{stats.winRate.toFixed(2)}%</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded shadow">
          <div className="text-sm">Avg Profit / Trade</div>
          <div className="text-xl font-bold">{formatCurrency(stats.avgProfit)}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-red-400 to-red-600 text-white rounded shadow">
          <div className="text-sm">Avg Loss / Trade</div>
          <div className="text-xl font-bold">{formatCurrency(stats.avgLoss)}</div>
        </div>
      </section>

      <section className="p-6 bg-white border rounded shadow">
        <h2 className="text-lg font-semibold mb-4">📈 3-Month Net P&L Prediction</h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={predictionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v) => `₹${Number(v)?.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Actual P&L" />
            <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Predicted P&L" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
