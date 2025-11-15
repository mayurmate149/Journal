import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../lib/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB ?? "trading";
  const db = client.db(dbName);
  const collection = db.collection("trades");

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid ID" });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch (err) {
    return res.status(400).json({ message: "Invalid ObjectId" });
  }

  if (req.method === "GET") {
    try {
      const trade = await collection.findOne({ _id: objectId });
      if (!trade) return res.status(404).json({ message: "Trade not found" });
      return res.status(200).json(trade);
    } catch (error) {
      return res.status(500).json({ message: "Error fetching trade", error });
    }
  }

  if (req.method === "PUT") {
    try {
      const trade = { ...req.body };
      delete trade._id; // _id is immutable


      const result = await collection.updateOne(
        { _id: objectId },
        { $set: trade }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Trade not found" });
      }

      const updatedTrade = await collection.findOne({ _id: objectId });
      return res.status(200).json(updatedTrade);
    } catch (error) {
      return res.status(500).json({ message: "Error updating trade", error });
    }
  }

  if (req.method === "DELETE") {
    try {
      const result = await collection.deleteOne({ _id: objectId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Trade not found" });
      }
      return res.status(200).json({ message: "Trade deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error deleting trade", error });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
