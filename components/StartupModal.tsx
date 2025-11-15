"use client";

import { useEffect, useRef, useState } from "react";

export default function StartupModal() {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // If user opted out persistently, don't show
    if (localStorage.getItem("startupModal.hide") === "1") return;
    // If shown this session already, don't show again in same session
    if (sessionStorage.getItem("startupModal.shown") === "1") return;

    // show modal on app open
    setOpen(true);
    sessionStorage.setItem("startupModal.shown", "1");

    // focus management: focus close button when opened
    setTimeout(() => closeBtnRef.current?.focus(), 40);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Startup guidance"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative max-w-xl w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg shadow-lg p-6">
        <header className="mb-3">
          <h2 className="text-lg font-semibold">Risk & Process Reminder</h2>
          <p className="text-sm text-slate-500 mt-1">A short guideline inspired by hedge-fund risk managers.</p>
        </header>

        <div className="text-sm text-slate-700 dark:text-slate-200 space-y-3 mb-4">
          <p>From a hedge-fund trader book — I am a risk manager. Keep rules simple and repeatable.</p>

          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Max risk:</strong> 1% per trade / position.</li>
            <li><strong>Target (max) profit:</strong> 2% per trade (use risk:reward and position sizing).</li>
            <li><strong>Focus:</strong> consistency and following process over chasing returns.</li>
          </ul>

          <p className="text-xs text-slate-400">
            These are guidelines — adapt to your plan and capital. Log trades consistently for better edge.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              className="mr-2"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
            />
            Don&apos;t show again
          </label>

          <div className="flex items-center gap-2">
            <button
              ref={closeBtnRef}
              onClick={handleClose}
              className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}