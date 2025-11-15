import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/connectToDatabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const conn = await connectToDatabase();
    const db = conn?.db;

    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    // Get aggregated dashboard data
    const pipeline = [
      {
        $addFields: {
          dateObj: {
            $dateFromString: {
              dateString: "$date",
              onError: null,
            },
          },
        },
      },
      {
        $addFields: {
          year: { $year: "$dateObj" },
          month: { $month: "$dateObj" },
        },
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
          },
          profit: { $sum: { $max: [{ $subtract: ["$profitAmount", "$lossAmount"] }, 0] } },
          loss: { $sum: { $max: [{ $subtract: ["$lossAmount", "$profitAmount"] }, 0] } },
          totalEarn: { $sum: { $subtract: ["$profitAmount", "$lossAmount"] } },
          winCount: {
            $sum: {
              $cond: [{ $gt: [{ $subtract: ["$profitAmount", "$lossAmount"] }, 0] }, 1, 0],
            },
          },
          lossCount: {
            $sum: {
              $cond: [{ $lt: [{ $subtract: ["$profitAmount", "$lossAmount"] }, 0] }, 1, 0],
            },
          },
          capitalDeployed: { $sum: "$capitalDeployed" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ];

    const data = (await db.collection("trades").aggregate(pipeline).toArray()) as Array<{
      _id: { year: number; month: number };
      profit: number;
      loss: number;
      totalEarn: number;
      winCount: number;
      lossCount: number;
      capitalDeployed: number;
    }>;

    // Transform to match expected format
    const transformed = data.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      profit: item.profit,
      loss: item.loss,
      totalEarn: item.totalEarn,
      winCount: item.winCount,
      lossCount: item.lossCount,
      capitalDeployed: item.capitalDeployed,
    }));

    return res.status(200).json(transformed);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return res.status(500).json({
      message: "Error fetching summary",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
