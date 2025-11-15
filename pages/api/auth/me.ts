import type { NextApiRequest, NextApiResponse } from "next";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";
import cookie from "cookie";
import { ObjectId } from "mongodb";
import clientPromise from "../../../lib/mongo";

const SECRET = process.env.JWT_SECRET || "mysecret";

interface MyJwtPayload extends DefaultJwtPayload {
  userId: string;
  email: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, SECRET) as MyJwtPayload; // ✅ typed payload
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB ?? "trading";
    const db = client.db(dbName);
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) return res.status(401).json({ message: "Invalid user" });

    res.status(200).json({ name: user.name, email: user.email });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
