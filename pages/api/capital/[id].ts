import { connectToDatabase } from "@/lib/connectToDatabase";
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID is required" });
  }

  if (req.method === "PUT") {
    try {
      const { db } = await connectToDatabase();
      const capitalCollection = db.collection("capital");

      const body = req.body;

      // Validate required fields
      if (!body.type || !body.amount || !body.date) {
        return res
          .status(400)
          .json({ error: "Missing required fields" });
      }

      const updateData = {
        type: body.type,
        amount: Number(body.amount),
        date: new Date(body.date).toISOString(),
        description: body.description || "",
        updatedAt: new Date().toISOString(),
      };

      const result = await capitalCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: "after" }
      );

      if (!result || !result.value) {
        return res
          .status(404)
          .json({ error: "Capital entry not found" });
      }

      return res.status(200).json(result.value);
    } catch (error) {
      console.error("Error updating capital entry:", error);
      return res
        .status(500)
        .json({ error: "Failed to update capital entry" });
    }
  } else if (req.method === "DELETE") {
    try {
      const { db } = await connectToDatabase();
      const capitalCollection = db.collection("capital");

      const result = await capitalCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ error: "Capital entry not found" });
      }

      return res
        .status(200)
        .json({ message: "Entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting capital entry:", error);
      return res
        .status(500)
        .json({ error: "Failed to delete capital entry" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

export default handler;
