import type { CapitalSummary } from "@/types/capital";

export async function fetchCapitalSummary(): Promise<CapitalSummary | null> {
  try {
    const res = await fetch("/api/capital");
    if (res.ok) {
      const data = await res.json();
      return data.summary;
    }
  } catch {}
  return null;
}
