"use client";
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    debugger;
    if (res.ok) router.push("/dashboard");
    else {
      const err = await res.json();
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="bg-white shadow-xl p-8 rounded-xl w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">Login to Journal</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="email" placeholder="Email" className="w-full border p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
        <p className="text-sm text-center">
          No account? <Link href="/register" className="text-blue-600 underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
