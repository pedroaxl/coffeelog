import type { UnitStatus } from "../api/types";

/** Format an ISO date (YYYY-MM-DD) as e.g. "28/06". Returns "" for null. */
export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Format an ISO date as e.g. "Jun 28, 2026". */
export function longDate(iso: string | null): string {
  if (!iso) return "—";
  const dt = new Date(`${iso}T00:00:00`);
  return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

/** Whole days between an ISO date and today (>= 0). */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(`${iso}T00:00:00`).getTime();
  const now = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

export interface StatusStyle {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

/** The status → color system from the design handoff. */
export const STATUS_STYLES: Record<UnitStatus, StatusStyle> = {
  open: { label: "Open", color: "#BE6A3A", bg: "#F3E6D6", dot: "#BE6A3A" },
  frozen: { label: "Frozen", color: "#5B7B8C", bg: "#EAF0F2", dot: "#6C8CA6" },
  defrosted: { label: "Defrosted", color: "#B07A1C", bg: "#F7EED8", dot: "#B07A1C" },
  consumed: { label: "Consumed", color: "#A99C8D", bg: "#F0EBE3", dot: "#A99C8D" },
};

export function gramsLabel(g: number): string {
  return `${Number.isInteger(g) ? g : g.toFixed(1)} g`;
}

/** Seconds as m:ss (170 -> "2:50"). Returns "" for null. */
export function mmss(sec: number | null | undefined): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

/**
 * Parse a drain time typed as "2:50" or as plain seconds ("170"). Returns null
 * for anything empty or unreadable — the field is always optional.
 */
export function parseMmSs(text: string): number | null {
  const value = text.trim();
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
    return Math.round(m * 60 + s);
  }
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}
