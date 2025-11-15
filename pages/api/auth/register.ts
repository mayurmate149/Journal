import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../lib/mongo";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB ?? "trading";
  const db = client.db(dbName);
  const users = db.collection("users");

  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

  const existing = await users.findOne({ email });
  if (existing) return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { name, email, password: hashed, createdAt: new Date() };
  await users.insertOne(newUser);

  res.status(201).json({ message: "User registered successfully" });
}
