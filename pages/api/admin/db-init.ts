import { connectToDatabase } from "@/lib/connectToDatabase";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Database Initialization Endpoint
 * Checks if collections exist and creates them if not
 * Also validates and adds missing fields (without creating documents)
 * 
 * Usage: GET /api/admin/db-init
 */

interface CollectionSchema {
  name: string;
  validators?: Record<string, unknown>;
  indexes?: Array<{
    keys: Record<string, number>;
    options?: Record<string, unknown>;
  }>;
}

const COLLECTIONS_CONFIG: CollectionSchema[] = [
  {
    name: "capital",
    validators: {
      bsonType: "object",
      required: ["type", "amount", "date"],
      properties: {
        _id: { bsonType: "objectId" },
        type: {
          enum: ["initial", "addition", "withdrawal"],
          description: "Type of capital entry",
        },
        amount: {
          bsonType: "number",
          description: "Amount in rupees",
        },
        date: {
          bsonType: "string",
          description: "Date of entry (ISO format)",
        },
        description: {
          bsonType: "string",
          description: "Optional notes",
        },
        createdAt: {
          bsonType: "string",
          description: "Creation timestamp",
        },
        updatedAt: {
          bsonType: "string",
          description: "Last update timestamp",
        },
      },
    },
    indexes: [
      { keys: { date: -1 } },
      { keys: { type: 1 } },
      { keys: { createdAt: -1 } },
    ],
  },
  {
    name: "trades",
    validators: {
      bsonType: "object",
      required: ["date", "symbol", "entry_price"],
      properties: {
        _id: { bsonType: "objectId" },
        date: { bsonType: "string" },
        symbol: { bsonType: "string" },
        entry_price: { bsonType: "number" },
        exit_price: { bsonType: "number" },
        quantity: { bsonType: "number" },
        trade_type: { enum: ["buy", "sell"] },
        status: { enum: ["active", "closed", "pending"] },
        profit_booked: { bsonType: "number" },
        loss_booked: { bsonType: "number" },
        capital_deployed: { bsonType: "number" },
        max_loss_allowed: { bsonType: "number" },
        confidence: { bsonType: "number" },
        emotions: { bsonType: "string" },
        discipline_score: { bsonType: "number" },
        fomo_score: { bsonType: "number" },
        strategy: { bsonType: "string" },
        notes: { bsonType: "string" },
        psychology: { bsonType: "object" },
        createdAt: { bsonType: "string" },
        updatedAt: { bsonType: "string" },
      },
    },
    indexes: [
      { keys: { date: -1 } },
      { keys: { status: 1 } },
      { keys: { symbol: 1 } },
      { keys: { createdAt: -1 } },
    ],
  },
  {
    name: "users",
    validators: {
      bsonType: "object",
      required: ["email", "password"],
      properties: {
        _id: { bsonType: "objectId" },
        email: { bsonType: "string" },
        password: { bsonType: "string" },
        name: { bsonType: "string" },
        createdAt: { bsonType: "string" },
        updatedAt: { bsonType: "string" },
      },
    },
    indexes: [
      { keys: { email: 1 }, options: { unique: true } },
      { keys: { createdAt: -1 } },
    ],
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { db } = await connectToDatabase();

    const results: Array<{
      collection: string;
      status: string;
      message: string;
      created?: boolean;
      indexesCreated?: string[];
      error?: string;
    }> = [];

    // Check and create each collection
    for (const collectionConfig of COLLECTIONS_CONFIG) {
      try {
        const collectionName = collectionConfig.name;
        const collections = await db.listCollections().toArray();
        const collectionExists = collections.some(
          (c) => c.name === collectionName
        );

        if (!collectionExists) {
          // Create collection with schema validation
          await db.createCollection(collectionName, {
            validator: {
              $jsonSchema: {
                bsonType: collectionConfig.validators?.bsonType || "object",
                properties:
                  collectionConfig.validators?.properties || undefined,
              },
            },
          });

          results.push({
            collection: collectionName,
            status: "created",
            message: `Collection '${collectionName}' created successfully`,
            created: true,
          });
        } else {
          results.push({
            collection: collectionName,
            status: "exists",
            message: `Collection '${collectionName}' already exists`,
            created: false,
          });
        }

        // Create indexes
        const collection = db.collection(collectionName);
        const indexesCreated: string[] = [];

        if (collectionConfig.indexes) {
          for (const indexConfig of collectionConfig.indexes) {
            try {
              const indexName = await collection.createIndex(
                indexConfig.keys,
                indexConfig.options
              );
              indexesCreated.push(indexName);
            } catch (indexError: unknown) {
              // Index might already exist, that's okay
              const error = indexError as Error;
              if (!error.message.includes("already exists")) {
                console.error(`Error creating index:`, error);
              }
            }
          }
        }

        // Update result with indexes
        const resultIndex = results.length - 1;
        if (resultIndex >= 0) {
          results[resultIndex].indexesCreated = indexesCreated;
        }
      } catch (error: unknown) {
        const err = error as Error;
        results.push({
          collection: collectionConfig.name,
          status: "error",
          message: `Error processing collection '${collectionConfig.name}'`,
          error: err.message,
        });
      }
    }

    return res.status(200).json(
      {
        status: "success",
        message: "Database initialization check completed",
        timestamp: new Date().toISOString(),
        collections: results,
        summary: {
          total: results.length,
          created: results.filter((r) => r.created).length,
          existing: results.filter((r) => !r.created && r.status === "exists")
            .length,
          errors: results.filter((r) => r.status === "error").length,
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Database initialization error:", err);
    return res.status(500).json(
      {
        status: "error",
        message: "Failed to initialize database",
        error: err.message,
        timestamp: new Date().toISOString(),
      }
    );
  }
}
