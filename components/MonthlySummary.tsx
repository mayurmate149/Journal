"use client";

import { useEffect, useState } from "react";

interface MonthlyData {
  year: number;
  month: number;
  profit: number;
  loss: number;
  totalEarn: number;
  winCount: number;
  lossCount: number;
  roi?: number;
}

interface MonthlySummaryProps {
  data?: MonthlyData[];
  loading?: boolean;
}

export default function MonthlySummary({ data: providedData, loading: providedLoading }: MonthlySummaryProps) {
  const [data, setData] = useState<MonthlyData[]>(providedData || []);
  const [loading, setLoading] = useState(providedLoading ?? true);

  useEffect(() => {
    if (providedData && providedData.length > 0) {
      setData(providedData);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const json = await res.json();
        if (Array.isArray(json)) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch monthly summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providedData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatMonth = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  const calculateROI = (data: MonthlyData[], index: number) => {
    let balance = 300000; // Initial capital
    for (let i = 0; i <= index; i++) {
      balance += data[i].totalEarn;
    }
    return data[index].totalEarn > 0 ? (data[index].totalEarn / balance) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading monthly summary...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">No monthly data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Monthly Summary</h3>
        <p className="text-sm text-gray-600 mt-1">Profit/Loss and trading performance by month</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Month</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Profit</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Loss</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Net Profit</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Wins</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Losses</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Total Trades</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const totalTrades = row.winCount + row.lossCount;
              const roi = calculateROI(data, index);
              const isPositive = row.totalEarn >= 0;

              return (
                <tr
                  key={`${row.year}-${row.month}`}
                  className={`border-b border-gray-200 ${isPositive ? "bg-green-50 hover:bg-green-100" : "bg-red-50 hover:bg-red-100"} transition`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {formatMonth(row.month, row.year)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600 font-semibold">
                    {formatCurrency(row.profit)}
                  </td>
                  <td className="px-6 py-4 text-right text-red-600 font-semibold">
                    {formatCurrency(row.loss)}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${isPositive ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(row.totalEarn)}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-900">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-700 font-semibold">
                      {row.winCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-900">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-700 font-semibold">
                      {row.lossCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-900 font-semibold">
                    {totalTrades}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold ${roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {roi.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">Total Trades</p>
            <p className="text-lg font-bold text-gray-900">
              {data.reduce((sum, row) => sum + row.winCount + row.lossCount, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">Total Profit</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(data.reduce((sum, row) => sum + row.profit, 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">Total Loss</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(data.reduce((sum, row) => sum + row.loss, 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">Net Profit</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrency(data.reduce((sum, row) => sum + row.totalEarn, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
