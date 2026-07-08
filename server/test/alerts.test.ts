import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers.js";

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

describe("home alerts", () => {
  it("flags bought-but-not-frozen coffees past the threshold", async () => {
    const { app } = testApp();
    // purchased 5 days ago, still an open (non-frozen) bag → over the 3-day default
    await request(app)
      .post("/api/coffees")
      .send({
        name: "Needs freezing",
        purchaseDate: iso(5),
        initialUnit: { weightG: 250, initialState: "open" },
      });
    // purchased today → not yet due
    await request(app)
      .post("/api/coffees")
      .send({
        name: "Fresh",
        purchaseDate: iso(0),
        initialUnit: { weightG: 250, initialState: "open" },
      });

    const res = await request(app).get("/api/alerts");
    expect(res.status).toBe(200);
    expect(res.body.portionFreeze.map((c: { name: string }) => c.name)).toEqual(["Needs freezing"]);
    expect(res.body.frozenTooLong).toHaveLength(0);
  });

  it("flags coffees frozen longer than the threshold", async () => {
    const { app } = testApp();
    await request(app)
      .post("/api/coffees")
      .send({ name: "Old freeze", initialUnit: { weightG: 250, initialState: "frozen" } });

    // Back-date the frozen unit to 50 days ago (> 40-day default).
    const c = (await request(app).get("/api/alerts")).body;
    expect(c.frozenTooLong).toHaveLength(0); // frozen today, not yet

    // simulate an old freeze directly
    const { db, app: app2 } = testApp();
    await request(app2)
      .post("/api/coffees")
      .send({ name: "Ancient", initialUnit: { weightG: 250, initialState: "frozen" } });
    db.prepare("UPDATE storage_units SET frozen_date = ? WHERE kind='bag'").run(iso(50));
    const res = await request(app2).get("/api/alerts");
    expect(res.body.frozenTooLong.map((x: { name: string }) => x.name)).toEqual(["Ancient"]);
  });

  it("respects updated thresholds from settings", async () => {
    const { app } = testApp();
    await request(app)
      .post("/api/coffees")
      .send({
        name: "Two days",
        purchaseDate: iso(2),
        initialUnit: { weightG: 250, initialState: "open" },
      });
    expect((await request(app).get("/api/alerts")).body.portionFreeze).toHaveLength(0);
    await request(app).patch("/api/settings").send({ warnNotFrozenAfterDays: 1 });
    expect((await request(app).get("/api/alerts")).body.portionFreeze).toHaveLength(1);
  });
});
