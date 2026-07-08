import { describe, it, expect } from "vitest";
import { filterAndSort, primaryStatus, hasOpenBag } from "./coffee";
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
    score: null,
    createdAt: "2026-07-01T00:00:00",
    lastUsedAt: null,
    tastingNotes: [],
    recipe: null,
    units: [unit({})],
    remainingG: 200,
    activeUnitCount: 1,
    status: "available",
    ...partial,
  };
}

describe("primaryStatus", () => {
  it("prefers open, then frozen, then defrosted, then consumed", () => {
    expect(primaryStatus(coffee({ units: [unit({ status: "open" })] }))).toBe("open");
    expect(
      primaryStatus(coffee({ units: [unit({ status: "frozen", sealState: "sealed", tempState: "frozen" })] }))
    ).toBe("frozen");
    expect(primaryStatus(coffee({ units: [], activeUnitCount: 0, status: "archived" }))).toBe(
      "consumed"
    );
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

  it("sorts by stars and filters by search", () => {
    const a = coffee({ id: 1, name: "Alpha", score: 2 });
    const b = coffee({ id: 2, name: "Beta", score: 5 });
    expect(filterAndSort([a, b], "all", "stars", "").map((c) => c.id)).toEqual([2, 1]);
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
