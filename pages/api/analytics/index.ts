import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/connectToDatabase";
import { calculateTradeAnalytics } from "@/lib/analyticsService";
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

    // Calculate analytics
    const analytics = calculateTradeAnalytics(trades);

    res.status(200).json(analytics);
  } catch (error) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
