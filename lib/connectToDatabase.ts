/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient, Db } from "mongodb";

// Polyfill URL.canParse for Node versions where it's missing (Node < 18)
if (typeof (URL as any).canParse !== "function") {
  (URL as any).canParse = (input: string) => {
    try {
      // use built-in URL constructor as a fallback
      new URL(input);
      return true;
    } catch {
      return false;
    }
  };
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Get the appropriate MongoDB URI based on the current environment
 * Production: uses MONGODB_URI_PROD or MONGODB_URI
 * Development: uses MONGODB_URI_DEV
 */
function getMongodbUri(): string {
  const env = process.env.NODE_ENV;
  const isProduction = env === "production";

  if (isProduction) {
    // Production: try MONGODB_URI_PROD first, then MONGODB_URI
    const prodUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;
    if (!prodUri) {
      throw new Error(
        "MongoDB URI not set for production. Set MONGODB_URI_PROD or MONGODB_URI in environment"
      );
    }
    return prodUri;
  } else {
    // Development: use MONGODB_URI_DEV
    const devUri = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;
    if (!devUri) {
      throw new Error(
        "MongoDB URI not set for development. Set MONGODB_URI_DEV in .env.local"
      );
    }
    return devUri;
  }
}

/**
 * Get the current environment and database info for logging
 */
function getEnvironmentInfo(): { env: string; dbType: string; uri: string } {
  const env = process.env.NODE_ENV || "development";
  const uri = getMongodbUri();
  const dbType = env === "production" ? "PRODUCTION" : "DEVELOPMENT";
  return { env, dbType, uri };
}

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = getMongodbUri();
  const { dbType } = getEnvironmentInfo();

  // Validate URI early to avoid internal driver URL.canParse failure
  if (!(URL as any).canParse(uri)) {
    throw new Error("MONGODB_URI appears invalid — check environment variable value");
  }

  let client: MongoClient;
  try {
    console.log(`[connectToDatabase] Connecting to ${dbType} database...`);
    client = new MongoClient(uri);
    await client.connect();
    console.log(`[connectToDatabase] Successfully connected to ${dbType} database`);
  } catch (err) {
    console.error(`[connectToDatabase] MongoClient.connect error (${dbType}):`, err);
    throw err;
  }

  const dbName = process.env.MONGODB_DB ?? "trading";
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

/**
 * Disconnect from MongoDB (useful for cleanup in tests)
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log("[disconnectFromDatabase] Disconnected from MongoDB");
  }
}

/**
 * Get current database information for debugging
 */
export function getDatabaseInfo(): { environment: string; databaseType: string; connected: boolean } {
  return {
    environment: process.env.NODE_ENV || "development",
    databaseType: (process.env.NODE_ENV || "development") === "production" ? "PRODUCTION" : "DEVELOPMENT",
    connected: cachedDb !== null,
  };
}

/**
 * Get the current MongoDB URI being used (for debugging only - be careful!)
 */
export function getCurrentUri(): string {
  try {
    return getMongodbUri();
  } catch {
    return "not-configured";
  }
}
