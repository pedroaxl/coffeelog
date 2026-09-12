import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { testApp } from "./helpers.js";

const recipe = {
  brewType: "filter",
  method: "Origami (Conical)",
  doseG: 12,
  yieldG: 200,
  waterTempC: 93,
  grinder: "1Zpresso ZP6",
  grinderSetting: "5.5",
  filter: "Cafec Abaca",
  protocol: "Bloom 40 g / 40 s",
  drainTargetMinSec: 150,
  drainTargetMaxSec: 180,
};

async function coffeeWith(app: Express, body: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/coffees")
    .send({ name: "Azahar", initialUnit: { weightG: 250, initialState: "open" }, ...body });
  return res.body;
}

describe("brew log", () => {
  it("records a brew from a drain time alone, filling the rest from the recipe", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const res = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 170 });

    expect(res.status).toBe(201);
    expect(res.body.brew).toMatchObject({
      drainTimeSec: 170,
      recipeVersionId: coffee.recipe.id,
      recipeVersion: 1,
      // executed parameters are stored even when identical to the plan
      method: "Origami (Conical)",
      doseG: 12,
      yieldG: 200,
      waterTempC: 93,
      grinder: "1Zpresso ZP6",
      grinderSetting: "5.5",
      filter: "Cafec Abaca",
      ratio: 16.7,
      validForDialIn: true,
    });
  });

  it("keeps an executed parameter that differed, without touching the recipe", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const res = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 165, waterTempC: 94 });

    expect(res.body.brew).toMatchObject({ waterTempC: 94, method: "Origami (Conical)" });
    expect(res.body.coffee.recipe).toMatchObject({ version: 1, waterTempC: 93 });
  });

  it("turns the first brew of a coffee with no recipe into v1", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app);
    expect(coffee.recipe).toBeNull();

    const res = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 180, method: "V60 02", doseG: 15, yieldG: 250 });

    expect(res.body.coffee.recipe).toMatchObject({
      version: 1,
      kind: "baseline",
      changeNote: "Created from first brew",
      method: "V60 02",
      doseG: 15,
    });
    expect(res.body.brew.recipeVersionId).toBe(res.body.coffee.recipe.id);
  });

  it("does not invent a recipe from a brew that carries no parameters", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app);
    const res = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ notes: "esqueci de anotar tudo" });
    expect(res.body.coffee.recipe).toBeNull();
    expect(res.body.brew.recipeVersionId).toBeNull();
  });

  it("stays editable after saving — the notes come after drinking it", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const { body } = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 170 });

    const res = await request(app)
      .patch(`/api/brews/${body.brew.id}`)
      .send({ notes: "doce, corpo bom", rating: 4, nextAction: "abrir para 6.0" });

    expect(res.body).toMatchObject({
      drainTimeSec: 170, // untouched
      notes: "doce, corpo bom",
      rating: 4,
      nextAction: "abrir para 6.0",
    });
  });

  it("computes extraction yield from the weight in the cup, not the water poured", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const res = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 170, tds: 1.4, beverageG: 180 });
    // 1.4 × 180 / 12 = 21% — using yieldG (200) would have inflated it.
    expect(res.body.brew.extractionYield).toBe(21);
  });

  it("omits extraction yield when the refractometer reading is missing", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const res = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 170 });
    expect(res.body.brew.extractionYield).toBeNull();
  });

  it("keeps a channeled brew in the history but out of the comparisons", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    await request(app).post(`/api/coffees/${coffee.id}/brews`).send({ drainTimeSec: 170 });
    await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 120, channeling: true, validForDialIn: false, discardReason: "canalizou" });

    const all = await request(app).get(`/api/coffees/${coffee.id}/brews`);
    expect(all.body).toHaveLength(2);
    const valid = await request(app).get(`/api/coffees/${coffee.id}/brews?validOnly=true`);
    expect(valid.body).toHaveLength(1);
    expect(valid.body[0].drainTimeSec).toBe(170);
  });

  it("promotes a brew into the next recipe version, keeping the protocol", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const { body } = await request(app)
      .post(`/api/coffees/${coffee.id}/brews`)
      .send({ drainTimeSec: 175, grinderSetting: "6.0", waterTempC: 94 });

    const res = await request(app)
      .post(`/api/brews/${body.brew.id}/promote`)
      .send({ changeNote: "ficou melhor assim" });

    expect(res.status).toBe(201);
    expect(res.body.recipeVersion).toMatchObject({
      version: 2,
      kind: "tweak",
      changeNote: "ficou melhor assim",
      grinderSetting: "6.0",
      waterTempC: 94,
      protocol: "Bloom 40 g / 40 s", // carried over from the version brewed
      drainTargetMinSec: 150,
    });
    expect(res.body.coffee.recipe.version).toBe(2);
  });

  it("groups brews by an experiment tag across coffees", async () => {
    const { app } = testApp();
    const a = await coffeeWith(app, { recipe });
    const b = await coffeeWith(app, { name: "Outro", recipe });
    await request(app)
      .post(`/api/coffees/${a.id}/brews`)
      .send({ drainTimeSec: 170, experimentTag: "wdt-ab" });
    await request(app)
      .post(`/api/coffees/${b.id}/brews`)
      .send({ drainTimeSec: 165, experimentTag: "wdt-ab" });
    await request(app).post(`/api/coffees/${a.id}/brews`).send({ drainTimeSec: 150 });

    const res = await request(app).get("/api/brews?experimentTag=wdt-ab");
    expect(res.body).toHaveLength(2);
    expect(new Set(res.body.map((x: any) => x.coffeeId))).toEqual(new Set([a.id, b.id]));
  });

  it("rejects a rating outside 1–5 and an unknown WDT value", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    expect(
      (await request(app).post(`/api/coffees/${coffee.id}/brews`).send({ rating: 9 })).status
    ).toBe(400);
    expect(
      (await request(app).post(`/api/coffees/${coffee.id}/brews`).send({ wdt: "sometimes" })).status
    ).toBe(400);
  });
});

describe("consume and brew as one gesture", () => {
  it("records both and links them", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const unit = coffee.units[0];

    const res = await request(app)
      .post(`/api/units/${unit.id}/consume`)
      .send({ grams: 12, brew: { drainTimeSec: 168, notes: "doce", rating: 4 } });

    expect(res.status).toBe(200);
    expect(res.body.brewId).not.toBeNull();
    expect(res.body.coffee.remainingG).toBe(238);
    expect(res.body.coffee.brewCount).toBe(1);
    expect(res.body.coffee.lastBrewedAt).not.toBeNull();

    const brew = (await request(app).get(`/api/brews/${res.body.brewId}`)).body;
    expect(brew).toMatchObject({
      unitId: unit.id,
      consumptionLogId: res.body.logId,
      drainTimeSec: 168,
      notes: "doce",
      doseG: 12, // from the recipe
    });
  });

  it("undoes the whole gesture, brew included", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const unit = coffee.units[0];
    const consumed = await request(app)
      .post(`/api/units/${unit.id}/consume`)
      .send({ grams: 12, brew: { drainTimeSec: 168 } });

    const undone = await request(app).post(`/api/consume/${consumed.body.logId}/undo`);
    expect(undone.body.remainingG).toBe(250);
    expect(undone.body.brewCount).toBe(0);
    expect((await request(app).get(`/api/brews/${consumed.body.brewId}`)).status).toBe(404);
  });

  it("still consumes without a brew, and keeps the free-text note visible", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const res = await request(app)
      .post(`/api/units/${coffee.units[0].id}/consume`)
      .send({ grams: 18, note: "só para acertar o estoque" });

    expect(res.body.brewId).toBeNull();
    expect(res.body.coffee.brewCount).toBe(0);
    expect(res.body.coffee.consumptionNotes).toEqual([
      { date: expect.any(String), note: "só para acertar o estoque" },
    ]);
  });

  it("shows a brew note once, not twice", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app, { recipe });
    const res = await request(app)
      .post(`/api/units/${coffee.units[0].id}/consume`)
      .send({ grams: 12, note: "ignorada", brew: { notes: "a nota do brew" } });

    expect(res.body.coffee.consumptionNotes).toEqual([
      { date: expect.any(String), note: "a nota do brew" },
    ]);
  });

  it("never blocks consuming on logging a brew", async () => {
    const { app } = testApp();
    const coffee = await coffeeWith(app);
    const res = await request(app)
      .post(`/api/units/${coffee.units[0].id}/consume`)
      .send({ grams: 18 });
    expect(res.status).toBe(200);
    expect(res.body.coffee.remainingG).toBe(232);
  });
});
