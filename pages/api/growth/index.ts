import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/connectToDatabase";
import { calculateGrowthMetrics } from "@/lib/growthService";
import { CapitalEntry } from "@/types/capital";
import { Trade } from "@/types/trade";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();

    // Get all trades
    const trades = (await db
      .collection("trades")
      .find({})
      .sort({ date: -1 })
      .toArray()) as unknown as Trade[];

    // Get all capital entries
    const capitalEntries = await db
      .collection("capital")
      .find({})
      .sort({ date: -1 })
      .toArray();

    // Map capitalEntries to CapitalEntry type
    const capitalEntriesTyped: CapitalEntry[] = capitalEntries.map((entry: unknown) => {
      const doc = entry as Record<string, unknown>;
      return {
        _id: doc._id ? String(doc._id) : undefined,
        type: doc.type as "initial" | "addition" | "withdrawal",
        amount: Number(doc.amount),
        date: String(doc.date),
        description: doc.description ? String(doc.description) : undefined,
        createdAt: doc.createdAt ? String(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? String(doc.updatedAt) : undefined,
      };
    });

    let startingCapital = 0;
    let totalAdditions = 0;
    let totalWithdrawals = 0;
    capitalEntriesTyped.forEach((entry) => {
      if (entry.type === "initial") {
        startingCapital += entry.amount;
      } else if (entry.type === "addition") {
        totalAdditions += entry.amount;
      } else if (entry.type === "withdrawal") {
        totalWithdrawals += entry.amount;
      }
    });

    // Calculate net P&L from trades
    let netPL = 0;
    trades.forEach((trade) => {
      const profit = Number(trade.profit_booked ?? trade.profitAmount ?? 0);
      const loss = Number(trade.loss_booked ?? trade.lossAmount ?? 0);
      netPL += profit - loss;
    });

    // Calculate current capital
    const currentCapital = startingCapital + totalAdditions - totalWithdrawals + netPL;

    // Use monthly top-up as before
    const monthlyTopUp = 20000; // ₹20,000

    // Calculate growth metrics
    const growthMetrics = calculateGrowthMetrics(
      trades,
      startingCapital,
      currentCapital,
      monthlyTopUp
    );

    res.status(200).json(growthMetrics);
  } catch (error) {
    console.error("Growth metrics fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch growth metrics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
