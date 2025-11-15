"use client";

import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div
      className={`${geistSans.className} ${geistMono.className} font-sans min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black text-slate-900 dark:text-gray-100`}
    >
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Home" className="inline-flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-emerald-600 text-white">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {/* simple "chart" / upward trend icon */}
                <polyline points="3 17 9 11 13 15 21 7" />
                <path d="M21 17v4H3v-2" />
              </svg>
            </span>

            <span className="hidden sm:inline-block text-sm font-semibold text-slate-700 dark:text-slate-100">
              Mayur Trading Journal
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/trades/list"
            className="px-3 py-2 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Trades
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded-md text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <section>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight mb-4">
            Welcome to Mayur Trading Journal
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-prose">
            Keep a clean record of your options trades, review monthly performance, and learn from past
            decisions. Add entries with ISO dates so the dashboard aggregates correctly.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/trades/list"
              className="inline-flex items-center gap-3 px-5 py-3 bg-emerald-600 text-white rounded-md shadow-sm hover:bg-emerald-700"
              aria-label="Open trades list"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7h18M3 12h18M3 17h18"
                />
              </svg>
              View trades
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 px-5 py-3 border rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open dashboard"
            >
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3v18h18"
                />
              </svg>
              Open dashboard
            </Link>
          </div>

          <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            Tip: Use the &quot;Add New Trade&quot; button on the trades page to record new entries. Keep dates as ISO strings
            (e.g. 2025-10-21T10:00:00Z) for accurate monthly aggregation.
          </div>
        </section>

        <aside className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-3">Quick links</h3>

          <ul className="space-y-3">
            <li>
              <Link
                href="/trades/list"
                className="flex items-center justify-between p-3 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="text-sm">
                  Trades list
                  <div className="text-xs text-slate-400">
                    View and manage all trades
                  </div>
                </div>
                <span className="text-emerald-600">→</span>
              </Link>
            </li>

            <li>
              <Link
                href="/dashboard"
                className="flex items-center justify-between p-3 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="text-sm">
                  Monthly dashboard
                  <div className="text-xs text-slate-400">
                    Performance overview
                  </div>
                </div>
                <span className="text-amber-600">→</span>
              </Link>
            </li>

            <li>
              <Link
                href="/trades/list"
                className="flex items-center justify-between p-3 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="text-sm">
                  Add trade
                  <div className="text-xs text-slate-400">
                    Quick add new trade
                  </div>
                </div>
                <span className="text-emerald-600">＋</span>
              </Link>
            </li>
          </ul>
        </aside>
      </main>
    </div>
  );
}
