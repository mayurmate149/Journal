"use client";

import { useEffect, useState } from "react";
import { Trade } from "../../../types/trade";
import TradeModal from "@/components/NewTrade";
import { confirm, successToast, errorAlert } from "@/components/swal";
import { exportTradesToCSV } from "@/ExportToCsv";


export default function ProTradeListPage() {

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTradeId, setExpandedTradeId] = useState<string | undefined>(undefined);

  const monthOptions = [
    { label: "All Months", value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: new Date(0, i).toLocaleString("default", { month: "long" }),
      value: i + 1,
    })),
  ];

  const yearOptions = Array.from({ length: 4 }, (_, i) => today.getFullYear() + i);

  const fetchTrades = async () => {
    try {
      setLoading(true);

      const query = new URLSearchParams({
        page: currentPage.toString(),
        limit: rowsPerPage.toString(),
        status: statusFilter,
        year: selectedYear.toString(),
      });
      // Only add month if not 'All Months'
      if (selectedMonth !== 0) {
        query.append("month", selectedMonth.toString().padStart(2, "0"));
      }

      const res = await fetch(`/api/trades?${query.toString()}`, {
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

      const data = await res.json();

      console.log("Fetched trades:", data);

      setTrades(data.data || []);
      setTotalPages(data.totalPages || 1); // store total pages from API
    } catch (err) {
      console.error("Error fetching trades:", err);
      setTrades([]);
      await errorAlert("Failed to load trades", "Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, selectedMonth, selectedYear, rowsPerPage]);



  const calculateMaxLoss = (trade: Trade) => {
    if (!trade.capital_deployed) return 0;
    return trade.capital_deployed * 0.01; // 1% of capital
  };

  const calculateMaxProfit = (trade: Trade) => {
    if (!trade.capital_deployed) return 0;
    return trade.capital_deployed * 0.02; // 2% of capital
  };

  // Calculate days in trade from entry and exit dates
  const calculateDaysInTrade = (trade: Trade) => {
    if (!trade.date) return "—";
    const entryDate = new Date(trade.date);
    // Prefer trade_exit_date if present, else use today
    const exitDate = trade.trade_exit_date ? new Date(trade.trade_exit_date) : new Date();
  // Calculate difference in days (rounded)
  const diffTime = exitDate.getTime() - entryDate.getTime();
  let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) diffDays = 1;
  return diffDays > 0 ? diffDays : "—";
  };


  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString() : "—";

  const formatCurrency = (value?: number | string) =>
    value == null || value === "" ? "—" : `₹${Number(value).toLocaleString()}`;

  const calculateROI = (trade: Trade) => {
    if (!trade.capital_deployed || trade.capital_deployed === 0) return 0;
    const profit = trade.profit_booked ?? 0;
    const loss = trade.loss_booked ?? 0;
    return ((profit - loss) / trade.capital_deployed) * 100;
  };

  const handleSave = async (trade: Trade) => {
    try {
      if (selectedTradeId) {
        const res = await fetch(`/api/trades/${selectedTradeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trade),
        });
        if (!res.ok) throw new Error("Update failed");
        const updatedTrade = await res.json();
        setTrades((prev) =>
          prev.map((t) => (t._id === selectedTradeId ? updatedTrade : t))
        );
        successToast("Trade updated");
      } else {
        const res = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trade),
        });
        if (!res.ok) throw new Error("Create failed");
        const savedTrade = await res.json();
        setTrades((prev) => [...prev, savedTrade]);
        successToast("Trade saved");
      }
    } catch (err) {
      console.error("Save error:", err);
      await errorAlert("Failed to save trade", "Check console for details.");
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleEdit = (tradeId: string | undefined) => {
    setSelectedTradeId(tradeId);
    setIsModalOpen(true);
  };

  const handleDelete = async (tradeId: string | undefined) => {
    if (!tradeId) {
      await errorAlert("Delete failed", "Invalid trade id");
      return;
    }

    const confirmed = await confirm(
      "Delete trade?",
      "Are you sure you want to delete this trade?",
      "Delete",
      "Cancel"
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/trades/${tradeId}`, { method: "DELETE" });
      if (res.ok) {
        setTrades((prev) => prev.filter((t) => t._id !== tradeId));
        successToast("Trade deleted");
      } else {
        const err = await res.json().catch(() => ({}));
        await errorAlert("Failed to delete trade", err.message || res.statusText || "");
      }
    } catch (error) {
      console.error("Delete error:", error);
      await errorAlert("Failed to delete trade", "Check console for details.");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedMonth, selectedYear]);


  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Options Trading Journal</h1>
          <p className="text-gray-500 mt-1">Track and review your option trades</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ADJUSTED">ADJUSTED</option>
            </select>

            <div className="flex gap-2">
              {/* Month */}
              <select
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(Number(e.target.value)); setCurrentPage(1); }}
                className="border rounded px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {/* Year */}
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); setCurrentPage(1); }}
                className="border rounded px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => exportTradesToCSV(trades)}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
          >
            Export CSV
          </button>

          <button
            onClick={() => {
              setSelectedTradeId(undefined);
              setIsModalOpen(true);
            }}
            className="mt-2 sm:mt-0 px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition"
          >
            + Add New Trade
          </button>
        </div>
      </header>

      {/* Trades Table */}
      <main className="bg-white shadow rounded-md overflow-hidden">
        <div className="flex justify-between items-center mt-4 p-4 border-b bg-gray-50 text-gray-600 font-medium ">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

        </div>



        <div className="overflow-x-auto">
          <table className="min-w-full text-sm table-fixed">
            <thead className="bg-white/90 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-3 py-2 text-center w-8">🔍</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-left">Strategy</th>
                <th className="px-3 py-2 text-left hidden sm:table-cell">View</th>
                <th className="px-3 py-2 text-left hidden lg:table-cell">Entry Reason</th>
                <th className="px-3 py-2 text-left hidden lg:table-cell">Entry Time</th>
                <th className="px-3 py-2 text-right">Capital</th>
                <th className="px-3 py-2 text-right">Premium</th>
                <th className="px-3 py-2 text-right hidden md:table-cell">Lots</th>
                <th className="px-3 py-2 text-right">Days in Trade</th>
                <th className="px-3 py-2 text-right hidden xl:table-cell">Max Loss</th>
                <th className="px-3 py-2 text-right hidden lg:table-cell">Max Profit</th>
                <th className="px-3 py-2 text-right hidden xl:table-cell">Booked Profit</th>
                <th className="px-3 py-2 text-right hidden xl:table-cell">Booked Loss</th>
                <th className="px-3 py-2 text-right hidden xl:table-cell">ROI</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {!loading && trades.length === 0 && (
                <tr>
                  <td colSpan={18} className="text-center p-6 text-gray-400">
                    No trades recorded
                  </td>
                </tr>
              )}

              {trades.map((trade, idx) => {
                const key = trade._id ?? idx;
                const isExpanded = expandedTradeId === key;
                return (
                  <>
                    <tr key={key} className="even:bg-gray-50 hover:bg-gray-100 transition">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setExpandedTradeId(isExpanded ? undefined : key as string)}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      </td>
                      <td className="px-3 py-2">{formatDate(trade.date)}</td>
                      <td className="px-3 py-2 font-medium">{trade.symbol || "—"}</td>
                      <td className="px-3 py-2">{trade.strategy || "—"}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{trade.view || "—"}</td>
                      <td className="px-3 py-2 hidden lg:table-cell truncate max-w-[20rem]">
                        {trade.entry_reason || "—"}
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell">{trade.entry_time || "—"}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(trade.capital_deployed)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(trade.premium_gain)}</td>
                      <td className="px-3 py-2 text-right hidden md:table-cell">{trade.lots ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{calculateDaysInTrade(trade)}</td>
                      <td
                        className={`px-3 py-2 text-right hidden xl:table-cell font-semibold ${trade.status === "OPEN" ? "animate-pulse-bg-red" : ""}`}
                      >
                        {formatCurrency(calculateMaxLoss(trade))}
                      </td>
                      <td
                        className={`px-3 py-2 text-right hidden xl:table-cell font-semibold ${trade.status === "OPEN" ? "animate-pulse-bg-green" : ""}`}
                      >
                        {formatCurrency(calculateMaxProfit(trade))}
                      </td>

                      <td className="px-3 py-2 text-right hidden xl:table-cell">{formatCurrency(trade.profit_booked)}</td>
                      <td className="px-3 py-2 text-right hidden xl:table-cell">{formatCurrency(trade.loss_booked)}</td>
                      <td
                        className={`px-3 py-2 text-right hidden xl:table-cell font-semibold ${trade.status === "OPEN" ? "animate-pulse-bg-yellow" : ""}`}
                      >
                        {calculateROI(trade).toFixed(2)}%
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs rounded font-medium ${trade.status === "OPEN"
                            ? "bg-green-100 text-green-800"
                            : trade.status === "CLOSED"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                            }`}
                        >
                          {trade.status || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(trade._id)}
                            className="px-2 py-1 bg-yellow-400 rounded text-white text-xs hover:bg-yellow-500 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(trade._id)}
                            className="px-2 py-1 bg-red-500 rounded text-white text-xs hover:bg-red-600 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Psychology Details Row */}
                    {isExpanded && (
                      <tr className="bg-blue-50 border-l-4 border-blue-600">
                        <td colSpan={18} className="px-6 py-4">
                          <div className="space-y-4">
                            <h4 className="font-bold text-blue-900 mb-3">🧠 Psychology & Behavioral Insights</h4>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {/* Pre-Trade Mindset */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">Pre-Trade Mindset</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.pre_trade_mindset || "—"}</p>
                              </div>

                              {/* Emotional State Entry */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">Emotions @ Entry</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.emotional_state_entry || "—"}</p>
                              </div>

                              {/* Confidence Level */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">Confidence Level</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.confidence_level ? `${trade.confidence_level}/10` : "—"}</p>
                              </div>

                              {/* FOMO/Fear */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">FOMO/Fear Indicator</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.fomo_fear || "—"}</p>
                              </div>

                              {/* Greed Indicator */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">Greed Level</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.greed_indicator || "—"}</p>
                              </div>

                              {/* Discipline Level */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">Discipline Level</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.discipline_level || "—"}</p>
                              </div>

                              {/* Trade Setup Conviction */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">Setup Conviction</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.trade_setup_conviction || "—"}</p>
                              </div>

                              {/* Emotional State Exit */}
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold">Emotions @ Exit</p>
                                <p className="text-sm text-gray-900 font-medium">{trade.emotional_state_exit || "—"}</p>
                              </div>
                            </div>

                            {/* Behavioral Notes */}
                            {trade.behavioral_notes && (
                              <div className="bg-white p-4 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 font-semibold mb-2">Behavioral Notes</p>
                                <p className="text-sm text-gray-700">{trade.behavioral_notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 p-4">
            {/* Page info */}
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page:</label>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1); // reset to first page
                }}
                className="border rounded px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </main>

      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        tradeId={selectedTradeId || undefined}
      />
    </div>
  );
}
