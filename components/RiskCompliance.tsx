"use client";

import { useEffect, useState } from "react";
import type { RiskCompliance } from "@/types/risk";

interface StatusIndicatorProps {
  status: "healthy" | "warning" | "critical";
  label: string;
}

function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const statusConfig = {
    healthy: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
      icon: "✅",
    },
    warning: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
      icon: "⚠️",
    },
    critical: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
      icon: "❌",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text} border ${config.border}`}
    >
      <span>{config.icon}</span>
      {label}
    </span>
  );
}

interface MetricRowProps {
  label: string;
  target: string;
  current: string | number;
  unit?: string;
  status: "healthy" | "warning" | "critical";
  percentage?: number;
}

function MetricRow({
  label,
  target,
  current,
  unit,
  status,
  percentage,
}: MetricRowProps) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-200">
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{label}</td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {target}
        {unit && <span className="text-xs ml-1">{unit}</span>}
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        {typeof current === "number" ? current.toLocaleString("en-IN") : current}
        {unit && <span className="text-xs ml-1">{unit}</span>}
      </td>
      <td className="px-6 py-4 text-sm">
        {percentage !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full ${
                status === "healthy"
                  ? "bg-green-500"
                  : status === "warning"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
        )}
        <StatusIndicator status={status} label={getStatusLabel(status)} />
      </td>
    </tr>
  );
}

function getStatusLabel(status: "healthy" | "warning" | "critical"): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
  }
}

function getMetricStatus(
  current: number,
  target: number,
  isInverse: boolean = false
): "healthy" | "warning" | "critical" {
  if (isInverse) {
    // For metrics where lower is better (like loss)
    if (current >= target) return "critical";
    if (current >= target * 0.7) return "warning";
    return "healthy";
  } else {
    // For metrics where higher is better (like discipline, hedge)
    if (current >= target * 0.95) return "healthy";
    if (current >= target * 0.8) return "warning";
    return "critical";
  }
}

export default function RiskCompliance() {
  const [riskData, setRiskData] = useState<RiskCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/risk");
        if (!response.ok) throw new Error("Failed to fetch risk data");
        const data = await response.json();
        setRiskData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setRiskData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading risk & compliance data...</div>
      </div>
    );
  }

  if (error || !riskData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading risk data: {error || "Unknown error"}
      </div>
    );
  }

  // Determine status for each metric
  const weeklyLossStatus = getMetricStatus(
    riskData.maxWeeklyLoss,
    riskData.maxWeeklyLossTarget,
    true
  );
  const exposureStatus = getMetricStatus(
    riskData.openExposurePercentage,
    riskData.openExposureTarget,
    false
  );
  const stopLossStatus = getMetricStatus(
    riskData.stopLossDiscipline,
    riskData.stopLossDisciplineTarget,
    false
  );
  const hedgeStatus = getMetricStatus(
    riskData.hedgeUsedPercentage,
    riskData.hedgeTarget,
    false
  );
  const capitalStatus = getMetricStatus(
    riskData.capitalSafetyBuffer,
    riskData.capitalSafetyTarget,
    false
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Risk & Compliance
          </h1>
          <p className="text-gray-600 mt-2">Safety & Review Metrics</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">
              {riskData.riskScore.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600">Risk Score (Lower = Better)</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {riskData.complianceScore.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600">Compliance Score</p>
          </div>
        </div>
      </div>

      {/* Risk & Compliance Score Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Overall Risk Level
          </h3>
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  riskData.riskScore <= 30
                    ? "bg-green-500"
                    : riskData.riskScore <= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${riskData.riskScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {riskData.riskScore <= 30
                ? "✅ Low Risk - Strategy is well-protected"
                : riskData.riskScore <= 60
                ? "⚠️ Medium Risk - Review risk parameters"
                : "❌ High Risk - Immediate action needed"}
            </p>
          </div>
        </div>

        {/* Compliance Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Compliance Status
          </h3>
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  riskData.complianceScore >= 80
                    ? "bg-green-500"
                    : riskData.complianceScore >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${riskData.complianceScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {riskData.complianceScore >= 80
                ? "✅ Fully Compliant - All rules followed"
                : riskData.complianceScore >= 60
                ? "⚠️ Partially Compliant - Address issues"
                : "❌ Non-Compliant - Multiple violations"}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            Risk Metrics & Targets
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Risk Metric
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Current
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label="Max Weekly Loss"
                target={`≤ ${riskData.maxWeeklyLossTarget} %`}
                current={riskData.maxWeeklyLoss}
                unit="%"
                status={weeklyLossStatus}
                percentage={Math.abs(riskData.maxWeeklyLoss / riskData.maxWeeklyLossTarget) * 100}
              />
              <MetricRow
                label="Open Exposure %"
                target={`≤ ${riskData.openExposureTarget} %`}
                current={riskData.openExposurePercentage}
                unit="%"
                status={exposureStatus}
                percentage={riskData.openExposurePercentage}
              />
              <MetricRow
                label="Stop Loss Discipline"
                target={`${riskData.stopLossDisciplineTarget} %`}
                current={riskData.stopLossDiscipline}
                unit="%"
                status={stopLossStatus}
                percentage={riskData.stopLossDiscipline}
              />
              <MetricRow
                label="Hedge Used"
                target={`≥ ${riskData.hedgeTarget} %`}
                current={riskData.hedgeUsedPercentage}
                unit="%"
                status={hedgeStatus}
                percentage={riskData.hedgeUsedPercentage}
              />
              <MetricRow
                label="Capital Safety Buffer"
                target={`₹ ${(riskData.capitalSafetyTarget / 100000).toFixed(1)} L`}
                current={`₹ ${(riskData.capitalSafetyBuffer / 100000).toFixed(2)} L`}
                status={capitalStatus}
              />
              <tr className="bg-blue-50 border-b border-gray-200 hover:bg-blue-100">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Rule Violations (Month)
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">—</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {riskData.ruleViolations}
                </td>
                <td className="px-6 py-4 text-sm">
                  <StatusIndicator
                    status={riskData.ruleViolations === 0 ? "healthy" : riskData.ruleViolations <= 2 ? "warning" : "critical"}
                    label={
                      riskData.ruleViolations === 0
                        ? "No Violations"
                        : `${riskData.ruleViolations} Violations`
                    }
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Margin Usage Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 font-medium mb-1">Total Capital</p>
          <p className="text-2xl font-bold text-gray-900">
            ₹{(riskData.totalCapital / 100000).toFixed(1)} L
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm text-gray-600 font-medium mb-1">Margin Used</p>
          <p className="text-2xl font-bold text-gray-900">
            ₹{(riskData.marginUsed / 100000).toFixed(2)} L
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {riskData.openExposurePercentage.toFixed(1)}% of capital
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 font-medium mb-1">
            Available Margin
          </p>
          <p className="text-2xl font-bold text-green-600">
            ₹{(riskData.marginAvailable / 100000).toFixed(2)} L
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(100 - riskData.openExposurePercentage).toFixed(1)}% available
          </p>
        </div>
      </div>

      {/* Execution Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Stop Loss Discipline
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Trades with Stop Loss Applied
              </span>
              <span className="text-lg font-bold text-gray-900">
                {riskData.tradesWithStopLoss}/{riskData.totalTrades}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  stopLossStatus === "healthy"
                    ? "bg-green-500"
                    : stopLossStatus === "warning"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${riskData.stopLossDiscipline}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {stopLossStatus === "healthy"
                ? "✅ Excellent discipline - All trades protected"
                : stopLossStatus === "warning"
                ? "⚠️ Improve discipline - Apply to more trades"
                : "❌ Critical - Apply stop loss to all trades"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hedge Strategy Usage
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Hedged Trades (Spreads)
              </span>
              <span className="text-lg font-bold text-gray-900">
                {riskData.hedgedTrades}/{riskData.totalTrades}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  hedgeStatus === "healthy"
                    ? "bg-green-500"
                    : hedgeStatus === "warning"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${riskData.hedgeUsedPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {hedgeStatus === "healthy"
                ? "✅ Good hedge coverage - Risk is well-distributed"
                : hedgeStatus === "warning"
                ? "⚠️ Increase hedging - Use more spreads"
                : "❌ Low hedge usage - Consider more protective strategies"}
            </p>
          </div>
        </div>
      </div>

      {/* Rule Violations */}
      {riskData.violationDetails && riskData.violationDetails.length > 0 && (
        <div className="bg-red-50 rounded-lg shadow overflow-hidden border border-red-200">
          <div className="p-6 border-b border-red-200 bg-red-100">
            <h2 className="text-lg font-semibold text-red-900">
              ⚠️ Recent Rule Violations
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-100 border-b border-red-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">
                    Violation Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200">
                {riskData.violationDetails.map((violation, idx) => (
                  <tr key={idx} className="hover:bg-red-100">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(violation.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {violation.type}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          violation.severity === "critical"
                            ? "bg-red-100 text-red-800"
                            : violation.severity === "major"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {violation.severity.charAt(0).toUpperCase() +
                          violation.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {violation.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Guidelines */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Risk Management Guidelines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-900 mb-1">📊 Max Weekly Loss</p>
            <p className="text-gray-600">
              Keep weekly losses within -3% of capital. This prevents large drawdowns.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">📈 Open Exposure</p>
            <p className="text-gray-600">
              Maintain exposure ≤70% to preserve capital buffer for opportunities.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">🛑 Stop Loss</p>
            <p className="text-gray-600">
              Apply stop loss to 100% of trades to limit per-trade risk.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">🔒 Hedge Strategy</p>
            <p className="text-gray-600">
              Use spreads/condors for ≥80% of trades to reduce directional risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
