import { MongoClient } from "mongodb";

// Get the appropriate MongoDB URI based on environment
function getMongoUri(): string {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (isProduction) {
    // Production: try MONGODB_URI_PROD first, then MONGODB_URI
    const prodUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;
    if (!prodUri) {
      throw new Error(
        "Please define MONGODB_URI_PROD or MONGODB_URI environment variable for production"
      );
    }
    return prodUri;
  } else {
    // Development: try MONGODB_URI_DEV first, then MONGODB_URI
    const devUri = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;
    if (!devUri) {
      throw new Error(
        "Please define MONGODB_URI_DEV or MONGODB_URI environment variable for development"
      );
    }
    return devUri;
  }
}

const uri = getMongoUri();
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri!, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri!, options);
  clientPromise = client.connect();
}

export default clientPromise;
