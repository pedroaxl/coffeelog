import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers.js";
import type { Express } from "express";

async function createWithOpenBag(app: Express, weightG = 250) {
  const res = await request(app)
    .post("/api/coffees")
    .send({ name: "Test", initialUnit: { weightG, initialState: "open" } });
  const coffee = res.body;
  return { coffeeId: coffee.id, bagId: coffee.units[0].id as number };
}

describe("portioning", () => {
  it("splits an open bag into tubes with individual weights in one transaction", async () => {
    const { app } = testApp();
    const { coffeeId, bagId } = await createWithOpenBag(app, 250);

    const res = await request(app)
      .post(`/api/units/${bagId}/portion`)
      .send({ tubes: [{ weightG: 20 }, { weightG: 15 }, { weightG: 15 }], tubeState: "frozen" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(coffeeId);
    const bag = res.body.units.find((u: { kind: string }) => u.kind === "bag");
    const tubes = res.body.units.filter((u: { kind: string }) => u.kind === "tube");
    expect(bag.weightG).toBe(200); // 250 - 50
    expect(tubes.map((t: { weightG: number }) => t.weightG).sort()).toEqual([15, 15, 20]);
    expect(tubes.every((t: { status: string }) => t.status === "frozen")).toBe(true);
    // remaining unchanged overall (mass conserved)
    expect(res.body.remainingG).toBe(250);
    // each tube has a distinct qr id
    const qrs = new Set(tubes.map((t: { qrId: string }) => t.qrId));
    expect(qrs.size).toBe(3);
  });

  it("rejects portioning more than the bag holds and rolls back", async () => {
    const { app, db } = testApp();
    const { bagId } = await createWithOpenBag(app, 30);
    const res = await request(app)
      .post(`/api/units/${bagId}/portion`)
      .send({ tubes: [{ weightG: 20 }, { weightG: 20 }], tubeState: "frozen" });
    expect(res.status).toBe(400);
    // no tubes were created (transaction rolled back)
    const tubeCount = db.prepare("SELECT COUNT(*) c FROM storage_units WHERE kind='tube'").get() as {
      c: number;
    };
    expect(tubeCount.c).toBe(0);
  });
});

describe("consume + undo", () => {
  it("subtracts grams from a bag and undoes exactly", async () => {
    const { app } = testApp();
    const { bagId } = await createWithOpenBag(app, 250);

    const consumed = await request(app).post(`/api/units/${bagId}/consume`).send({ grams: 18 });
    expect(consumed.status).toBe(200);
    expect(consumed.body.coffee.units[0].weightG).toBe(232);
    const logId = consumed.body.logId;

    const undone = await request(app).post(`/api/consume/${logId}/undo`);
    expect(undone.status).toBe(200);
    expect(undone.body.units[0].weightG).toBe(250);

    // second undo conflicts
    const again = await request(app).post(`/api/consume/${logId}/undo`);
    expect(again.status).toBe(409);
  });

  it("consumes a whole tube and stores an optional note, then undoes", async () => {
    const { app } = testApp();
    const { bagId } = await createWithOpenBag(app, 250);
    const portioned = await request(app)
      .post(`/api/units/${bagId}/portion`)
      .send({ tubes: [{ weightG: 20 }], tubeState: "frozen" });
    const tube = portioned.body.units.find((u: { kind: string }) => u.kind === "tube");

    const consumed = await request(app)
      .post(`/api/units/${tube.id}/consume`)
      .send({ note: "Too fast — grind finer next time" });
    expect(consumed.status).toBe(200);
    const consumedTube = consumed.body.coffee.units.find((u: { id: number }) => u.id === tube.id);
    expect(consumedTube.consumed).toBe(true);
    expect(consumedTube.status).toBe("consumed");

    const undone = await request(app).post(`/api/consume/${consumed.body.logId}/undo`);
    const restored = undone.body.units.find((u: { id: number }) => u.id === tube.id);
    expect(restored.consumed).toBe(false);
    expect(restored.status).toBe("frozen");
  });

  it("rejects consuming more than the bag holds", async () => {
    const { app } = testApp();
    const { bagId } = await createWithOpenBag(app, 10);
    const res = await request(app).post(`/api/units/${bagId}/consume`).send({ grams: 50 });
    expect(res.status).toBe(400);
  });
});

describe("unit state changes", () => {
  it("freezes and defrosts a bag, managing the frozen date", async () => {
    const { app } = testApp();
    const { bagId } = await createWithOpenBag(app, 250);

    const frozen = await request(app).patch(`/api/units/${bagId}`).send({ tempState: "frozen" });
    const fbag = frozen.body.units[0];
    expect(fbag.status).toBe("frozen");
    expect(fbag.frozenDate).not.toBeNull();

    const defrosted = await request(app)
      .patch(`/api/units/${bagId}`)
      .send({ tempState: "defrosted" });
    expect(defrosted.body.units[0].status).toBe("open"); // open bag, defrosted
  });
});

describe("a fully consumed coffee derives as archived", () => {
  it("archives once no active units remain", async () => {
    const { app } = testApp();
    const res = await request(app)
      .post("/api/coffees")
      .send({ name: "Solo tube", initialUnit: { weightG: 20, initialState: "open" } });
    const bagId = res.body.units[0].id;
    // consume the whole bag weight
    await request(app).post(`/api/units/${bagId}/consume`).send({ grams: 20 });
    const after = await request(app).get(`/api/coffees/${res.body.id}`);
    expect(after.body.status).toBe("archived");
    expect(after.body.remainingG).toBe(0);
  });
});

describe("editing the frozen date", () => {
  it("backdates a frozen unit's frozen date", async () => {
    const { app } = testApp();
    const created = await request(app)
      .post("/api/coffees")
      .send({ name: "Old freeze", initialUnit: { weightG: 250, initialState: "frozen" } });
    const bagId = created.body.units[0].id;

    const res = await request(app).patch(`/api/units/${bagId}`).send({ frozenDate: "2026-01-15" });
    expect(res.status).toBe(200);
    const bag = res.body.units.find((u: { id: number }) => u.id === bagId);
    expect(bag.frozenDate).toBe("2026-01-15");
    expect(bag.status).toBe("frozen");
  });
});
