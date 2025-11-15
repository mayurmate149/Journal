"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import type { GrowthMetrics } from "@/types/growth";

interface MetricBoxProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  highlight?: boolean;
}

function MetricBox({ label, value, unit, subtext, highlight }: MetricBoxProps) {
  return (
    <div
      className={`rounded-lg shadow p-4 ${
        highlight ? "bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300" : "bg-white"
      }`}
    >
      <p className="text-sm text-gray-600 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-green-700" : "text-gray-900"}`}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        {unit && <span className="text-lg ml-1">{unit}</span>}
      </p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

export default function ProjectionPanel() {
  const [growthData, setGrowthData] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customROI, setCustomROI] = useState(1.22);
  const [monthlyTopUp, setMonthlyTopUp] = useState(20000);
  const [projectionWeeks, setProjectionWeeks] = useState(100);

  const [customScenario, setCustomScenario] = useState({
    timeToTarget: -1,
    year1Projection: 0,
  });

  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/growth");
        if (!response.ok) throw new Error("Failed to fetch growth data");
        const data = await response.json();
        setGrowthData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setGrowthData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGrowthData();
  }, []);

  // Calculate custom scenario when inputs change
  useEffect(() => {
    if (!growthData) return;

    const calculateScenario = async () => {
      try {
        // Use the calculation from service
        const weeklyROI = customROI;
        let capital = growthData.currentCapital;
        let weeks = 0;

        // Calculate time to ₹1 Crore
        const targetCorpus = 10000000;
        while (capital < targetCorpus && weeks < 500) {
          capital = capital * (1 + weeklyROI / 100);
          if ((weeks + 1) % 4 === 0) {
            capital += monthlyTopUp;
          }
          weeks++;
        }

        // Calculate year 1 projection
        let year1Capital = growthData.currentCapital;
        for (let w = 0; w < 52; w++) {
          year1Capital = year1Capital * (1 + weeklyROI / 100);
          if ((w + 1) % 4 === 0) {
            year1Capital += monthlyTopUp;
          }
        }

        setCustomScenario({
          timeToTarget: weeks < 500 ? weeks : -1,
          year1Projection: Math.round(year1Capital),
        });
      } catch (err) {
        console.error("Error calculating scenario:", err);
      }
    };

    calculateScenario();
  }, [customROI, monthlyTopUp, growthData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading growth projections...</div>
      </div>
    );
  }

  if (error || !growthData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading growth data: {error || "Unknown error"}
      </div>
    );
  }

  // Filter projection data to requested weeks
  const displayData = growthData.projectionData.slice(0, projectionWeeks);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Compounding & Growth Projection
          </h1>
          <p className="text-gray-600 mt-2">Capital Growth Simulator</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-green-600">
            ₹{Math.round(growthData.currentCapital).toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-gray-600">Current Capital</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricBox
          label="Starting Capital"
          value={`₹${growthData.startingCapital.toLocaleString("en-IN")}`}
          subtext={undefined}
        />
        <MetricBox
          label="Average Weekly ROI"
          value={growthData.averageWeeklyROI.toFixed(2)}
          unit="%"
          subtext="Based on actual trades"
        />
        <MetricBox
          label="Weeks Passed"
          value={growthData.weeksSinceStart}
          subtext={`~${Math.round(growthData.weeksSinceStart / 4)} months`}
        />
        <MetricBox
          label="Monthly Top-up"
          value={`₹${growthData.monthlyTopUp.toLocaleString("en-IN")}`}
          subtext={undefined}
        />
      </div>

      {/* Interactive Controls */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Simulation Parameters
        </h2>

        {/* ROI Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Weekly ROI (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={customROI.toFixed(2)}
                onChange={(e) => setCustomROI(parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-1 border border-gray-300 rounded text-right font-semibold"
                step="0.01"
                min="0"
                max="10"
              />
              <span className="text-lg font-bold text-blue-600">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.01"
            value={customROI}
            onChange={(e) => setCustomROI(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>Current: {growthData.averageWeeklyROI.toFixed(2)}%</span>
            <span>10%</span>
          </div>
        </div>

        {/* Monthly Top-up Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Monthly Top-up (₹)
          </label>
          <input
            type="number"
            value={monthlyTopUp}
            onChange={(e) => setMonthlyTopUp(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            step="10000"
          />
        </div>

        {/* Projection Weeks Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Projection Period (weeks)
            </label>
            <span className="text-lg font-bold text-blue-600">
              {projectionWeeks} weeks
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            step="10"
            value={projectionWeeks}
            onChange={(e) => setProjectionWeeks(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Target Metrics & Projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricBox
          label="Target Corpus"
          value="1"
          unit="Cr"
          subtext="₹1,00,00,000"
          highlight={true}
        />
        <MetricBox
          label="Time to ₹1 Crore"
          value={
            customScenario.timeToTarget > 0
              ? `${customScenario.timeToTarget} weeks`
              : "Beyond 500 weeks"
          }
          subtext={
            customScenario.timeToTarget > 0
              ? `${Math.round(customScenario.timeToTarget / 4)} months (${Math.round(customScenario.timeToTarget / 52)} years)`
              : "Need higher ROI"
          }
          highlight={customScenario.timeToTarget > 0 && customScenario.timeToTarget < 260}
        />
        <MetricBox
          label="Year 1 Projected"
          value={Math.round(customScenario.year1Projection / 100000)}
          unit="L"
          subtext={`₹${customScenario.year1Projection.toLocaleString("en-IN")}`}
        />
      </div>

      {/* Growth Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Capital Growth Curve ({projectionWeeks} weeks)
        </h3>
        {displayData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" label={{ value: "Weeks", position: "insideBottomRight", offset: -5 }} />
              <YAxis
                yAxisId="left"
                label={{ value: "Capital (₹)", angle: -90, position: "insideLeft" }}
                tickFormatter={(value) => `${(value / 100000).toFixed(0)}L`}
              />
              <Tooltip
                formatter={(value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="capital"
                fill="#dbeafe"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Total Capital"
                isAnimationActive={true}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="compounding"
                stroke="#10b981"
                strokeWidth={2}
                name="Compounding Growth"
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="topUp"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Top-up Contributions"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-gray-500">
            No projection data available
          </div>
        )}
      </div>

      {/* Scenario Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            ROI Scenarios - Time to ₹1 Crore
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Weekly ROI
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Time (Weeks)
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Time (Months)
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Time (Years)
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Year 1 Projection
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {growthData.scenarios.map((scenario, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-gray-50 ${
                    scenario.roiPercentage === growthData.averageWeeklyROI
                      ? "bg-blue-50"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <span
                      className={`inline-block px-3 py-1 rounded-full ${
                        scenario.roiPercentage === growthData.averageWeeklyROI
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {scenario.roiPercentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {scenario.weekToTarget > 0
                      ? scenario.weekToTarget.toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {scenario.monthToTarget && scenario.monthToTarget > 0
                      ? scenario.monthToTarget.toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {scenario.yearToTarget && scenario.yearToTarget > 0
                      ? scenario.yearToTarget.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">
                    ₹{Math.round(scenario.projectedCorpus).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Growth Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compounding vs Top-up Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Growth Composition (Current)
          </h3>
          {displayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(value) => `${(value / 100000).toFixed(0)}L`} />
                <Tooltip
                  formatter={(value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`}
                />
                <Legend />
                <Area
                  stackId="a"
                  type="monotone"
                  dataKey="compounding"
                  fill="#10b981"
                  stroke="#059669"
                  name="Compounding Growth"
                />
                <Area
                  stackId="a"
                  type="monotone"
                  dataKey="topUp"
                  fill="#f59e0b"
                  stroke="#d97706"
                  name="Top-up Contributions"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Growth Metrics Info */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 Growth Insights
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900">Power of Compounding</p>
              <p className="text-gray-600 mt-1">
                Even small weekly ROI compounds significantly over time. A 1% weekly ROI translates
                to ~68% annually (including top-ups).
              </p>
            </div>
            <div className="border-t pt-3 border-blue-200">
              <p className="font-semibold text-gray-900">Consistent Top-ups Matter</p>
              <p className="text-gray-600 mt-1">
                ₹70,000 monthly top-ups accelerate capital growth and reduce time to target by
                leveraging compounding on larger base.
              </p>
            </div>
            <div className="border-t pt-3 border-blue-200">
              <p className="font-semibold text-gray-900">ROI Impact</p>
              <p className="text-gray-600 mt-1">
                Increasing weekly ROI from 1% to 2% reduces time to ₹1 Cr by ~60%. Focus on edge
                improvement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Target Milestones */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Capital Milestones (at current {growthData.averageWeeklyROI.toFixed(2)}% weekly ROI)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "₹50 L", color: "bg-blue-100 text-blue-800" },
            { label: "₹1 Cr", color: "bg-green-100 text-green-800" },
            { label: "₹5 Cr", color: "bg-purple-100 text-purple-800" },
            { label: "₹10 Cr", color: "bg-orange-100 text-orange-800" },
          ].map((milestone, idx) => {
            // Calculate approximate weeks to reach each milestone
            let capital = growthData.currentCapital;
            let weeks = 0;
            const target = milestone.label === "₹50 L" ? 5000000 : milestone.label === "₹1 Cr" ? 10000000 : milestone.label === "₹5 Cr" ? 50000000 : 100000000;

            while (capital < target && weeks < 1000) {
              capital = capital * (1 + growthData.averageWeeklyROI / 100);
              if ((weeks + 1) % 4 === 0) {
                capital += growthData.monthlyTopUp;
              }
              weeks++;
            }

            return (
              <div key={idx} className={`rounded-lg p-4 ${milestone.color}`}>
                <p className="font-semibold text-center">{milestone.label}</p>
                <p className="text-xs text-center mt-1">
                  {weeks < 1000 ? `${(weeks / 52).toFixed(1)} years` : "Beyond 19 years"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
