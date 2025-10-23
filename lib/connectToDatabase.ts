/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient, Db } from "mongodb";

// Polyfill URL.canParse for Node versions where it's missing (Node < 18)
if (typeof (URL as any).canParse !== "function") {
  (URL as any).canParse = (input: string) => {
    try {
      // use built-in URL constructor as a fallback
      // eslint-disable-next-line no-new
      new URL(input);
      return true;
    } catch {
      return false;
    }
  };
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  // Validate URI early to avoid internal driver URL.canParse failure
  if (!(URL as any).canParse(uri)) {
    throw new Error("MONGODB_URI appears invalid — check environment variable value");
  }

  let client: MongoClient;
  try {
    client = new MongoClient(uri);
    await client.connect();
  } catch (err) {
    console.error("[connectToDatabase] MongoClient.connect error:", err);
    throw err;
  }

  const dbName = process.env.MONGODB_DB ?? "trading";
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;
  return { client, db };
}
