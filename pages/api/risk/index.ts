import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/connectToDatabase";
import { calculateRiskCompliance } from "@/lib/riskComplianceService";
import { Trade } from "@/types/trade";
import { RuleViolation } from "@/types/risk";

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

    // Get all rule violations
    const ruleViolations = (await db
      .collection("rule_violations")
      .find({})
      .sort({ date: -1 })
      .toArray()) as unknown as RuleViolation[];

    // Calculate risk & compliance metrics
    const riskCompliance = calculateRiskCompliance(trades, ruleViolations);

    res.status(200).json(riskCompliance);
  } catch (error) {
    console.error("Risk & Compliance fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch risk & compliance data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
