import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/connectToDatabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const isProd = process.env.NODE_ENV === "production";

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  let db;
  try {
    const conn = await connectToDatabase();
    db = conn?.db;
    if (!db || typeof db.command !== "function") {
      return res.status(500).json({ message: "Database not available" });
    }
  } catch (connErr) {
    return res.status(500).json(
      isProd
        ? { message: "Database connection failed" }
        : { message: "Database connection failed", error: String(connErr), stack: connErr }
    );
  }

  try {
    await db.command({ ping: 1 });
  } catch (pingErr) {
    return res.status(500).json(
      isProd
        ? { message: "Database not connected" }
        : { message: "Database not connected", error: String(pingErr), stack: pingErr }
    );
  }

  const pipeline = [
    {
      $addFields: {
        dateObj: {
          $switch: {
            branches: [
              { case: { $eq: [{ $type: "$date" }, "date"] }, then: "$date" },
              { case: { $in: [{ $type: "$date" }, ["int", "long"]] }, then: { $toDate: "$date" } },
              { case: { $eq: [{ $type: "$date" }, "string"] }, then: { $dateFromString: { dateString: "$date", onError: null } } },
            ],
            default: null,
          },
        },
      },
    },
    { $match: { dateObj: { $ne: null } } },
    {
      $group: {
        _id: { year: { $year: "$dateObj" }, month: { $month: "$dateObj" } },
        totalProfit: { $sum: { $ifNull: ["$profit_booked", 0] } },
        totalLoss: { $sum: { $ifNull: ["$loss_booked", 0] } },
        winCount: { $sum: { $cond: [{ $gt: ["$profit_booked", 0] }, 1, 0] } },
        lossCount: { $sum: { $cond: [{ $gt: ["$loss_booked", 0] }, 1, 0] } },
        capitalDeployed: { $sum: { $ifNull: ["$capital_deployed", 0] } }, // optional if you track capital deployed per trade
      },
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        profit: "$totalProfit",
        loss: "$totalLoss",
        totalEarn: { $subtract: ["$totalProfit", "$totalLoss"] },
        winCount: 1,
        lossCount: 1,
        capitalDeployed: 1,
      },
    },
    { $sort: { year: 1, month: 1 } },
  ];

  try {
    const data = await db.collection("trades").aggregate(pipeline).toArray();
    return res.status(200).json(data);
  } catch (aggErr) {
    console.error(`[dashboard][${reqId}] Aggregation failed`, aggErr);
    return res.status(500).json(
      isProd
        ? { message: "Failed to fetch dashboard data" }
        : { message: "Failed to fetch dashboard data", error: String(aggErr), stack: aggErr }
    );
  }
}
