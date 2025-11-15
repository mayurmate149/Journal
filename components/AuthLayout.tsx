"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        console.log("res.ok checauth =>", res.ok);
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.replace("/login"); // redirect if not logged in
        }
      } catch (err) {
        setIsAuthenticated(false);
        router.replace("/login"); // redirect on error
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return null;
  }

  // Only render children if authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
