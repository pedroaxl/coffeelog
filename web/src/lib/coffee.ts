import type { Coffee, StorageUnit, UnitKind, UnitStatus } from "../api/types";
import { gramsLabel } from "./format";

/** One kind+status bucket of a coffee's active units, for the card's icon summary. */
export interface InventoryGroup {
  kind: UnitKind;
  status: UnitStatus;
  count: number;
}

const STATUS_ORDER: UnitStatus[] = ["frozen", "open", "defrosted"];

/** Active units bucketed by kind and status: tubes first, then frozen → open → defrosted. */
export function inventorySummary(coffee: Coffee): InventoryGroup[] {
  const groups: InventoryGroup[] = [];
  for (const kind of ["tube", "bag"] as UnitKind[]) {
    for (const status of STATUS_ORDER) {
      const count = coffee.units.filter((u) => u.active && u.kind === kind && u.status === status).length;
      if (count > 0) groups.push({ kind, status, count });
    }
  }
  return groups;
}

/** What sits in the freezer: active frozen tubes, or active frozen bags that are still sealed. */
export function freezerUnits(coffee: Coffee, kind: UnitKind): StorageUnit[] {
  return coffee.units.filter(
    (u) =>
      u.active &&
      u.kind === kind &&
      u.tempState === "frozen" &&
      (kind === "tube" || u.sealState === "sealed")
  );
}

/** Weights grouped heaviest first, e.g. "8× 18 g · 15 g" (a single unit drops the "1×"). */
export function groupedWeights(units: StorageUnit[]): string {
  const counts = new Map<number, number>();
  for (const u of units) counts.set(u.weightG, (counts.get(u.weightG) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([g, n]) => (n > 1 ? `${n}× ${gramsLabel(g)}` : gramsLabel(g)))
    .join(" · ");
}

export interface FreezerEntry {
  coffee: Coffee;
  units: StorageUnit[];
  oldestFrozenDate: string | null;
}

/** Available coffees with freezer units of `kind`, the longest-frozen first. */
export function freezerList(coffees: Coffee[], kind: UnitKind): FreezerEntry[] {
  return coffees
    .filter((c) => c.status === "available")
    .map((coffee) => {
      const units = freezerUnits(coffee, kind);
      const dates = units.map((u) => u.frozenDate).filter((d): d is string => d != null).sort();
      return { coffee, units, oldestFrozenDate: dates[0] ?? null };
    })
    .filter((e) => e.units.length > 0)
    .sort(
      (a, b) =>
        (a.oldestFrozenDate ?? "9999").localeCompare(b.oldestFrozenDate ?? "9999") ||
        a.coffee.name.localeCompare(b.coffee.name)
    );
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
export type CatalogSort = "recent" | "longest" | "portion";

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
