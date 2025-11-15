import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, getDatabaseInfo } from "@/lib/connectToDatabase";

interface DbStatusResponse {
  status: string;
  environment: string;
  databaseType: string;
  connected: boolean;
  database?: string;
  collections?: string[];
  message?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DbStatusResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const dbInfo = getDatabaseInfo();
    
    // Get list of collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    return res.status(200).json({
      status: "connected",
      environment: dbInfo.environment,
      databaseType: dbInfo.databaseType,
      connected: dbInfo.connected,
      database: process.env.MONGODB_DB || "trading",
      collections: collectionNames,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[db-status] Error:", err);

    return res.status(500).json({
      status: "error",
      environment: process.env.NODE_ENV || "development",
      databaseType: (process.env.NODE_ENV || "development") === "production" ? "PRODUCTION" : "DEVELOPMENT",
      connected: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
