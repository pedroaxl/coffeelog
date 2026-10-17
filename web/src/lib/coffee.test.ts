import { describe, it, expect } from "vitest";
import {
  filterAndSort,
  hasOpenBag,
  inventorySummary,
  freezerUnits,
  groupedWeights,
  freezerList,
} from "./coffee";
import type { Coffee, StorageUnit } from "../api/types";

function unit(partial: Partial<StorageUnit>): StorageUnit {
  return {
    id: 1,
    coffeeId: 1,
    kind: "bag",
    weightG: 200,
    qrId: "AAAAAA",
    sealState: "open",
    tempState: "defrosted",
    consumed: false,
    frozenDate: null,
    openedDate: "2026-07-01",
    status: "open",
    active: true,
    ...partial,
  };
}

function coffee(partial: Partial<Coffee>): Coffee {
  return {
    id: 1,
    name: "Test",
    roaster: null,
    variety: null,
    process: null,
    beanRegion: null,
    beanCountry: null,
    roasteryName: null,
    roasteryCountry: null,
    altitudeM: null,
    roastLevel: null,
    roastDate: null,
    purchaseDate: null,
    photoPath: null,
    photos: [],
    score: null,
    createdAt: "2026-07-01T00:00:00",
    lastUsedAt: null,
    tastingNotes: [],
    recipe: null,
    units: [unit({})],
    remainingG: 200,
    activeUnitCount: 1,
    brewCount: 0,
    lastBrewedAt: null,
    consumptionNotes: [],
    status: "available",
    ...partial,
  };
}

function tube(partial: Partial<StorageUnit>): StorageUnit {
  return unit({
    kind: "tube",
    weightG: 18,
    sealState: null,
    tempState: "frozen",
    status: "frozen",
    frozenDate: "2026-09-01",
    openedDate: null,
    ...partial,
  });
}

function frozenBag(partial: Partial<StorageUnit>): StorageUnit {
  return unit({
    weightG: 250,
    sealState: "sealed",
    tempState: "frozen",
    status: "frozen",
    frozenDate: "2026-09-01",
    openedDate: null,
    ...partial,
  });
}

describe("inventorySummary", () => {
  it("buckets active units, tubes first, skipping consumed ones", () => {
    const c = coffee({
      units: [
        tube({ id: 1 }),
        tube({ id: 2 }),
        tube({ id: 3, consumed: true, status: "consumed", active: false }),
        unit({ id: 4 }),
        frozenBag({ id: 5 }),
      ],
    });
    expect(inventorySummary(c)).toEqual([
      { kind: "tube", status: "frozen", count: 2 },
      { kind: "bag", status: "frozen", count: 1 },
      { kind: "bag", status: "open", count: 1 },
    ]);
  });
});

describe("freezerUnits", () => {
  it("keeps frozen tubes, and only sealed frozen bags", () => {
    const c = coffee({
      units: [
        tube({ id: 1 }),
        tube({ id: 2, tempState: "defrosted", status: "defrosted" }),
        frozenBag({ id: 3 }),
        frozenBag({ id: 4, sealState: "open" }),
        unit({ id: 5 }),
      ],
    });
    expect(freezerUnits(c, "tube").map((u) => u.id)).toEqual([1]);
    expect(freezerUnits(c, "bag").map((u) => u.id)).toEqual([3]);
  });
});

describe("groupedWeights", () => {
  it("groups equal weights heaviest first and drops 1×", () => {
    const units = [15, 18, 18, 18, 20].map((g, i) => tube({ id: i, weightG: g }));
    expect(groupedWeights(units)).toBe("20 g · 3× 18 g · 15 g");
  });
});

describe("freezerList", () => {
  it("lists available coffees with freezer units, longest frozen first", () => {
    const fresh = coffee({ id: 1, name: "Fresh", units: [tube({ frozenDate: "2026-10-10" })] });
    const old = coffee({
      id: 2,
      name: "Old",
      units: [tube({ frozenDate: "2026-09-20" }), tube({ frozenDate: "2026-08-01" })],
    });
    const noTubes = coffee({ id: 3, units: [frozenBag({})] });
    const archived = coffee({ id: 4, status: "archived", units: [tube({})] });
    const list = freezerList([fresh, old, noTubes, archived], "tube");
    expect(list.map((e) => e.coffee.id)).toEqual([2, 1]);
    expect(list[0].oldestFrozenDate).toBe("2026-08-01");
    expect(freezerList([fresh, old, noTubes], "bag").map((e) => e.coffee.id)).toEqual([3]);
  });
});

describe("filterAndSort", () => {
  const available = coffee({ id: 1, name: "Sítio", score: 4, createdAt: "2026-07-05T00:00:00" });
  const archived = coffee({
    id: 2,
    name: "Gone",
    status: "archived",
    activeUnitCount: 0,
    units: [],
    createdAt: "2026-07-06T00:00:00",
  });

  it("honors the scope segmented control", () => {
    const all = [available, archived];
    expect(filterAndSort(all, "available", "recent", "").map((c) => c.id)).toEqual([1]);
    expect(filterAndSort(all, "archived", "recent", "").map((c) => c.id)).toEqual([2]);
    expect(filterAndSort(all, "all", "recent", "")).toHaveLength(2);
  });

  it("filters by search", () => {
    const a = coffee({ id: 1, name: "Alpha" });
    const b = coffee({ id: 2, name: "Beta" });
    expect(filterAndSort([a, b], "all", "recent", "beta").map((c) => c.id)).toEqual([2]);
  });

  it("portion filter keeps only coffees with an open bag", () => {
    const withOpen = coffee({ id: 1, units: [unit({ sealState: "open" })] });
    const frozenOnly = coffee({
      id: 2,
      units: [unit({ sealState: "sealed", tempState: "frozen", status: "frozen" })],
    });
    expect(hasOpenBag(withOpen)).toBe(true);
    expect(hasOpenBag(frozenOnly)).toBe(false);
    expect(filterAndSort([withOpen, frozenOnly], "all", "portion", "").map((c) => c.id)).toEqual([1]);
  });
});
