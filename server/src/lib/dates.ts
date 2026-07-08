export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole days between an ISO date (YYYY-MM-DD) and today, or null. */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(`${iso}T00:00:00Z`).getTime();
  const now = new Date(`${today()}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((now - then) / 86_400_000));
}
