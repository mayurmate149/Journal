import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongo";

interface Trade {
  _id?: string;
  date: string;
  status: string;
  symbol?: string;
  strategy?: string;
  profitAmount?: number;
  lossAmount?: number;
  premiumGain?: number;
  [key: string]: string | number | boolean | undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB ?? "trading";
    const db = client.db(dbName);
    const tradesCollection = db.collection<Trade>("trades");

    // Get last 10 trades sorted by date descending
    const recentTrades = await tradesCollection
      .find({})
      .sort({ date: -1 })
      .limit(10)
      .toArray();


    // Transform trades to include PnL (support both profit_booked/loss_booked and profitAmount/lossAmount)
    const formattedTrades = recentTrades.map((trade) => {
      // Prefer profit_booked/loss_booked if present, else fallback to profitAmount/lossAmount
      const profit = Number(trade.profit_booked ?? trade.profitAmount ?? 0);
      const loss = Number(trade.loss_booked ?? trade.lossAmount ?? 0);
      const pnl = profit - loss;
      const isWin = pnl > 0;

      return {
        id: trade._id?.toString() || "",
        date: trade.date,
        symbol: trade.symbol || "NIFTY",
        strategy: trade.strategy || "Unknown",
        pnl,
        isWin,
        status: trade.status,
        premiumGain: trade.premium_gain ?? trade.premiumGain ?? 0,
      };
    });

    return res.status(200).json(formattedTrades);
  } catch (error) {
    console.error("Error fetching recent trades:", error);
    return res.status(500).json({
      message: "Error fetching recent trades",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
