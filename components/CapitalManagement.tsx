"use client";

import { useEffect, useState } from "react";
import { CapitalEntry, CapitalSummary } from "@/types/capital";
import { successToast, errorAlert, confirm } from "@/components/swal";

export default function CapitalManagement() {
  const [capitalEntries, setCapitalEntries] = useState<CapitalEntry[]>([]);
  const [summary, setSummary] = useState<CapitalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    type: "initial" as "initial" | "addition" | "withdrawal",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  // Fetch all capital entries
  const fetchCapitalData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/capital");
      if (res.ok) {
        const data = await res.json();
        setCapitalEntries(data.entries || []);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch capital data:", err);
      await errorAlert("Error", "Failed to load capital data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapitalData();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || Number(formData.amount) <= 0) {
      await errorAlert("Invalid Input", "Please enter a valid amount");
      return;
    }

    try {
      const payload = {
        type: formData.type,
        amount: Number(formData.amount),
        date: formData.date,
        description: formData.description,
      };

      if (editingId) {
        // Update existing entry
        const res = await fetch(`/api/capital/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          successToast("Capital entry updated");
          setEditingId(null);
        } else {
          throw new Error("Update failed");
        }
      } else {
        // Create new entry
        const res = await fetch("/api/capital", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          successToast("Capital entry added");
        } else {
          throw new Error("Create failed");
        }
      }

      // Reset form
      setFormData({
        type: "initial",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
      setShowForm(false);
      fetchCapitalData();
    } catch (err) {
      console.error("Error:", err);
      await errorAlert("Error", "Failed to save capital entry");
    }
  };

  // Handle delete
  const handleDelete = async (id: string | undefined) => {
    if (!id) return;

    const confirmed = await confirm(
      "Delete Entry?",
      "Are you sure you want to delete this capital entry?",
      "Delete",
      "Cancel"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/capital/${id}`, { method: "DELETE" });
      if (res.ok) {
        successToast("Entry deleted");
        fetchCapitalData();
      } else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      await errorAlert("Error", "Failed to delete entry");
    }
  };

  // Handle edit
  const handleEdit = (entry: CapitalEntry) => {
    setFormData({
      type: entry.type,
      amount: entry.amount.toString(),
      date: entry.date.split("T")[0],
      description: entry.description || "",
    });
    setEditingId(entry._id || null);
    setShowForm(true);
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-gray-500">Loading capital data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">💰 Capital Management</h1>
          <p className="text-gray-600 mt-1">
            Track your trading capital and manage risk parameters
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              type: "initial",
              amount: "",
              date: new Date().toISOString().split("T")[0],
              description: "",
            });
            setShowForm(!showForm);
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {showForm ? "✕ Cancel" : "+ Add Entry"}
        </button>
      </div>

      {/* Capital Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Current Capital */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border border-green-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-700">Current Capital</h3>
              <span className="text-3xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-green-900 mb-1">
              {formatCurrency(summary.currentCapital)}
            </p>
            <div className="space-y-1 text-xs text-green-600">
              <p>Initial: {formatCurrency(summary.initialCapital)}</p>
              <p>+ Additions: {formatCurrency(summary.totalAdditions)}</p>
              {summary.totalWithdrawals > 0 && (
                <p>- Withdrawals: {formatCurrency(summary.totalWithdrawals)}</p>
              )}
            </div>
          </div>

          {/* Max Loss Per Trade (1%) */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-lg p-6 border border-red-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-red-700">1% Loss Limit</h3>
              <span className="text-3xl">🛑</span>
            </div>
            <p className="text-3xl font-bold text-red-900 mb-1">
              {formatCurrency(summary.maxLossPerTrade)}
            </p>
            <p className="text-xs text-red-600">
              Max loss per trade (1% of capital)
            </p>
            <div className="mt-3 bg-red-200 rounded h-2">
              <div
                className="bg-red-600 h-2 rounded transition-all"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>

          {/* Max Profit Per Trade (2%) */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border border-blue-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-700">2% Profit Target</h3>
              <span className="text-3xl">🎯</span>
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-1">
              {formatCurrency(summary.maxProfitPerTrade)}
            </p>
            <p className="text-xs text-blue-600">
              Target profit per trade (2% of capital)
            </p>
            <div className="mt-3 bg-blue-200 rounded h-2">
              <div
                className="bg-blue-600 h-2 rounded transition-all"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? "Edit Capital Entry" : "Add Capital Entry"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "initial" | "addition" | "withdrawal",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="initial">Initial Capital</option>
                  <option value="addition">Capital Addition</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Bonus, Salary, Profit withdrawal"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                {editingId ? "Update Entry" : "Add Entry"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Capital Entries History */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">📋 Capital Entries History</h2>
          <p className="text-sm text-gray-600 mt-1">
            All capital additions, withdrawals, and initial setup
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Description</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {capitalEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No capital entries yet. Add your initial capital to get started!
                  </td>
                </tr>
              ) : (
                capitalEntries.map((entry, idx) => (
                  <tr
                    key={entry._id || idx}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-3 text-gray-900 font-medium">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          entry.type === "initial"
                            ? "bg-blue-100 text-blue-800"
                            : entry.type === "addition"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {entry.type === "initial"
                          ? "🔵 Initial"
                          : entry.type === "addition"
                          ? "🟢 Addition"
                          : "🔴 Withdrawal"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`font-semibold ${
                          entry.type === "withdrawal"
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {entry.type === "withdrawal" ? "-" : "+"}
                        {formatCurrency(entry.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {entry.description || "—"}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="px-3 py-1 bg-yellow-400 text-white rounded text-xs hover:bg-yellow-500 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Management Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Risk Management Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            • <span className="font-semibold">1% Rule:</span> Never risk more than
            {summary && ` ₹${summary.maxLossPerTrade.toLocaleString("en-IN")}`} (1% of your capital)
            on a single trade
          </li>
          <li>
            • <span className="font-semibold">2% Target:</span> Aim for at least
            {summary && ` ₹${summary.maxProfitPerTrade.toLocaleString("en-IN")}`} profit (2% of your capital)
            to maintain a good risk-reward ratio
          </li>
          <li>
            • <span className="font-semibold">Capital Preservation:</span> Always use
            stop-loss orders to protect your capital
          </li>
          <li>
            • <span className="font-semibold">Compound Growth:</span> Track additions
            and withdrawals to monitor your account growth
          </li>
        </ul>
      </div>
    </div>
  );
}
