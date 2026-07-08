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
