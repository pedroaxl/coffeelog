import type { Coffee, UnitStatus } from "../api/types";

/** A single representative status for a coffee card's pill. */
export function primaryStatus(coffee: Coffee): UnitStatus {
  const active = coffee.units.filter((u) => u.active);
  if (active.length === 0) return "consumed";
  if (active.some((u) => u.status === "open")) return "open";
  if (active.some((u) => u.status === "frozen")) return "frozen";
  return "defrosted";
}

export function hasOpenBag(coffee: Coffee): boolean {
  return coffee.units.some((u) => u.kind === "bag" && u.active && u.sealState === "open");
}

/** Earliest frozen date among active units (for "longest frozen" sort). */
export function earliestFrozenDate(coffee: Coffee): string | null {
  const dates = coffee.units
    .filter((u) => u.active && u.status === "frozen" && u.frozenDate)
    .map((u) => u.frozenDate!)
    .sort();
  return dates[0] ?? null;
}

export type CatalogScope = "available" | "all" | "archived";
export type CatalogSort = "recent" | "stars" | "longest" | "portion";

export function filterAndSort(
  coffees: Coffee[],
  scope: CatalogScope,
  sort: CatalogSort,
  query: string
): Coffee[] {
  const q = query.trim().toLowerCase();
  let out = coffees.filter((c) => {
    if (scope === "available" && c.status !== "available") return false;
    if (scope === "archived" && c.status !== "archived") return false;
    if (sort === "portion" && !hasOpenBag(c)) return false;
    if (q) {
      const hay = `${c.name} ${c.roaster ?? ""} ${c.beanRegion ?? ""} ${c.beanCountry ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  out = [...out].sort((a, b) => {
    switch (sort) {
      case "stars":
        return (b.score ?? -1) - (a.score ?? -1);
      case "longest": {
        const da = earliestFrozenDate(a) ?? "9999";
        const db = earliestFrozenDate(b) ?? "9999";
        return da.localeCompare(db);
      }
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
  return out;
}
