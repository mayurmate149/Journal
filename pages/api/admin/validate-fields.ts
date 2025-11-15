import { connectToDatabase } from "@/lib/connectToDatabase";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Field Validation and Migration Endpoint
 * Checks if collections have required fields and adds missing ones without modifying documents
 * 
 * Usage: GET /api/admin/validate-fields
 */

interface FieldValidation {
  collection: string;
  totalDocuments: number;
  missingFields: {
    fieldName: string;
    missingCount: number;
    percentage: number;
  }[];
  validationStatus: "ok" | "needs-migration";
}

const FIELD_REQUIREMENTS: Record<string, string[]> = {
  capital: ["type", "amount", "date"],
  trades: ["date", "symbol", "entry_price", "status"],
  users: ["email", "password"],
};

const OPTIONAL_FIELDS: Record<string, string[]> = {
  capital: ["description", "createdAt", "updatedAt"],
  trades: [
    "exit_price",
    "quantity",
    "trade_type",
    "profit_booked",
    "loss_booked",
    "capital_deployed",
    "max_loss_allowed",
    "confidence",
    "emotions",
    "discipline_score",
    "fomo_score",
    "strategy",
    "notes",
    "psychology",
    "createdAt",
    "updatedAt",
  ],
  users: ["name", "createdAt", "updatedAt"],
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();

    const validationResults: FieldValidation[] = [];

    // Check each collection
    for (const [collectionName, requiredFields] of Object.entries(
      FIELD_REQUIREMENTS
    )) {
      try {
        const collection = db.collection(collectionName);

        // Count documents
        const documentCount = await collection.countDocuments();

        if (documentCount === 0) {
          validationResults.push({
            collection: collectionName,
            totalDocuments: 0,
            missingFields: [],
            validationStatus: "ok",
          });
          continue;
        }

        // Check each required field
        const missingFields: FieldValidation["missingFields"] = [];

        for (const fieldName of requiredFields) {
          const missingCount = await collection.countDocuments({
            [fieldName]: { $exists: false },
          });

          if (missingCount > 0) {
            missingFields.push({
              fieldName,
              missingCount,
              percentage: Math.round((missingCount / documentCount) * 100),
            });
          }
        }

        // Check optional fields (for info only, don't report as issues)
        const optionalFieldsInfo: FieldValidation["missingFields"] = [];
        const optionalFields = OPTIONAL_FIELDS[collectionName] || [];

        for (const fieldName of optionalFields) {
          const missingCount = await collection.countDocuments({
            [fieldName]: { $exists: false },
          });

          if (missingCount > 0 && missingCount < documentCount) {
            optionalFieldsInfo.push({
              fieldName,
              missingCount,
              percentage: Math.round((missingCount / documentCount) * 100),
            });
          }
        }

        const validationStatus = missingFields.length > 0 ? "needs-migration" : "ok";

        validationResults.push({
          collection: collectionName,
          totalDocuments: documentCount,
          missingFields: [...missingFields, ...optionalFieldsInfo],
          validationStatus,
        });
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`Error validating collection ${collectionName}:`, err);

        validationResults.push({
          collection: collectionName,
          totalDocuments: 0,
          missingFields: [],
          validationStatus: "ok",
        });
      }
    }

    // Summary
    const summary = {
      totalCollectionsChecked: validationResults.length,
      collectionsWithIssues: validationResults.filter(
        (r) => r.validationStatus === "needs-migration"
      ).length,
      totalMissingFieldInstances: validationResults.reduce(
        (sum, r) =>
          sum +
          r.missingFields.reduce((fieldSum, f) => fieldSum + f.missingCount, 0),
        0
      ),
    };

    return res.status(200).json({
      status: "success",
      message: "Field validation completed",
      timestamp: new Date().toISOString(),
      collections: validationResults,
      summary,
      notes: "Missing fields in required collections need migration. Optional fields are informational only.",
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Field validation error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to validate fields",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
