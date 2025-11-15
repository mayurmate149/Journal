import type { NextApiRequest, NextApiResponse } from "next";
import { Document, Filter, Sort } from "mongodb";
import clientPromise from "../../../lib/mongo";

// Define your trade type
interface Trade extends Document {
  _id?: string;
  date: string;
  status: string;
  symbol?: string;
  strategy?: string;
  capitalDeployed?: number;
  premiumGain?: number;
  expectedProfit?: number;
  maxLossAllowed?: number;
  exitTrigger?: string;
  profitAmount?: number;
  lossAmount?: number;
  planned?: boolean;
  adjustmentPlan?: string;
  [key: string]: string | number | boolean | undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB ?? "trading";
  const db = client.db(dbName);
  const collection = db.collection<Trade>("trades");

  if (req.method === "GET") {
    try {
      const { page = "1", limit = "5", status = "ALL", sortBy = "date", month, year } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const filter: Filter<Trade> = {};
      if (status !== "ALL") filter.status = status;

      if (month && year) {
        // Create proper Date objects for comparison with MongoDB Date fields
        const start = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
        const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (filter.date as any) = { $gte: start, $lte: end };
      }

      const totalCount = await collection.countDocuments(filter);
      
      const sort: Sort = sortBy === "date" ? { date: -1 } : { status: 1 };

      const trades = await collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .toArray();

      return res.status(200).json({
        data: trades,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching trades", error });
    }
  }

  if (req.method === "POST") {
    try {
      const trade: Trade = { ...req.body };
      delete trade._id;

      const result = await collection.insertOne(trade);
      const savedTrade = await collection.findOne({ _id: result.insertedId });
      return res.status(201).json(savedTrade);
    } catch (error) {
      return res.status(500).json({ message: "Error creating trade", error });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
