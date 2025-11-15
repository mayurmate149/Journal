import { connectToDatabase } from "@/lib/connectToDatabase";
import type { NextApiRequest, NextApiResponse } from "next";
import { Document } from "mongodb";

interface CapitalEntry extends Document {
  type: "initial" | "addition" | "withdrawal";
  amount: number;
  date: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const { db } = await connectToDatabase();
      const capitalCollection = db.collection<CapitalEntry>("capital");
      const tradesCollection = db.collection("trades");

      // Get all capital entries sorted by date
      const entries = await capitalCollection
        .find({})
        .sort({ date: -1 })
        .toArray();

      // Calculate summary
      let initialCapital = 0;
      let totalAdditions = 0;
      let totalWithdrawals = 0;

      entries.forEach((entry) => {
        if (entry.type === "initial") {
          initialCapital += entry.amount;
        } else if (entry.type === "addition") {
          totalAdditions += entry.amount;
        } else if (entry.type === "withdrawal") {
          totalWithdrawals += entry.amount;
        }
      });

      // Calculate net P&L from all trades
      const trades = await tradesCollection.find({}).toArray();
      let netPL = 0;
      trades.forEach((trade) => {
        const profit = Number(trade.profit_booked ?? trade.profitAmount ?? 0);
        const loss = Number(trade.loss_booked ?? trade.lossAmount ?? 0);
        netPL += profit - loss;
      });

      const currentCapital =
        initialCapital + totalAdditions - totalWithdrawals + netPL;
      const maxLossPerTrade = currentCapital * 0.01; // 1%
      const maxProfitPerTrade = currentCapital * 0.02; // 2%

      const summary = {
        initialCapital,
        totalAdditions,
        totalWithdrawals,
        netPL,
        currentCapital,
        maxLossPerTrade: Math.round(maxLossPerTrade),
        maxProfitPerTrade: Math.round(maxProfitPerTrade),
        lastUpdated: new Date().toISOString(),
      };

      return res.status(200).json({ entries, summary });
    } catch (error) {
      console.error("Error fetching capital data:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch capital data" });
    }
  } else if (req.method === "POST") {
    try {
      const { db } = await connectToDatabase();
      const capitalCollection = db.collection("capital");

      const body = req.body;

      // Validate required fields
      if (!body.type || !body.amount || !body.date) {
        return res
          .status(400)
          .json({ error: "Missing required fields" });
      }

      const entry = {
        type: body.type,
        amount: Number(body.amount),
        date: new Date(body.date).toISOString(),
        description: body.description || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await capitalCollection.insertOne(entry);

      return res.status(201).json({ ...entry, _id: result.insertedId });
    } catch (error) {
      console.error("Error creating capital entry:", error);
      return res
        .status(500)
        .json({ error: "Failed to create capital entry" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

export default handler;
