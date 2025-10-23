import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../lib/mongo";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const SECRET = process.env.JWT_SECRET || "mysecret";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const client = await clientPromise;
  const db = client.db("trading");
  const users = db.collection("users");

  const { email, password } = req.body;
  const user = await users.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id, email: user.email }, SECRET, { expiresIn: "7d" });

  res.setHeader(
    "Set-Cookie",
    cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "strict",
      path: "/",
    })
  );

  res.status(200).json({ message: "Login successful", name: user.name });
}
