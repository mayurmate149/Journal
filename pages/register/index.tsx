"use client";
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) router.push("/login");
    else {
      const err = await res.json();
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleRegister} className="bg-white shadow-xl p-8 rounded-xl w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">Register</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="text" placeholder="Name" className="w-full border p-2 rounded" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Email" className="w-full border p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700">Register</button>
        <p className="text-sm text-center">
          Already have an account? <Link href="/login" className="text-purple-600 underline">Login</Link>
        </p>
      </form>
    </div>
  );
}
