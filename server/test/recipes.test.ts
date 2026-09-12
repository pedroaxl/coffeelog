import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { Db } from "../src/db/connection.js";
import { testApp } from "./helpers.js";

async function makeCoffee(app: Express, recipe?: Record<string, unknown>) {
  const res = await request(app)
    .post("/api/coffees")
    .send({ name: "Azahar", roaster: "Isso É Café", recipe });
  return res.body.id as number;
}

/** Attach a brew to a recipe version, which is what freezes it. */
function addBrew(db: Db, coffeeId: number, versionId: number) {
  db.prepare(
    "INSERT INTO brews (coffee_id, recipe_version_id, drain_time_sec) VALUES (?, ?, 170)"
  ).run(coffeeId, versionId);
}

const baseRecipe = {
  brewType: "filter",
  method: "Origami (Conical)",
  doseG: 12,
  yieldG: 200,
  waterTempC: 93,
  grinder: "1Zpresso ZP6",
  grinderSetting: "5.5",
  protocol: "Bloom 40 g / 40 s",
};

describe("recipe versions", () => {
  it("makes the first recipe v1 and a baseline", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app).get(`/api/coffees/${id}`);
    expect(res.body.recipe).toMatchObject({
      version: 1,
      kind: "baseline",
      changeNote: null,
      method: "Origami (Conical)",
      ratio: 16.7,
      brewCount: 0,
      isCurrent: true,
    });
  });

  it("POST appends a version, moves the pointer and supersedes the old one", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const created = await request(app)
      .post(`/api/coffees/${id}/recipe`)
      .send({ ...baseRecipe, waterTempC: 94, changeNote: "subi a temperatura" });

    expect(created.status).toBe(201);
    expect(created.body.recipe).toMatchObject({
      version: 2,
      kind: "tweak", // a later version defaults to a comparable step
      changeNote: "subi a temperatura",
      waterTempC: 94,
      isCurrent: true,
    });

    const versions = await request(app).get(`/api/coffees/${id}/recipe/versions`);
    expect(versions.body.map((v: any) => v.version)).toEqual([2, 1]); // newest first
    expect(versions.body[1]).toMatchObject({
      version: 1,
      waterTempC: 93,
      isCurrent: false,
    });
    expect(versions.body[1].supersededAt).not.toBeNull();
    expect(versions.body[0].supersededAt).toBeNull();
  });

  it("PUT still works and behaves like POST", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app)
      .put(`/api/coffees/${id}/recipe`)
      .send({ ...baseRecipe, grinderSetting: "6.0" });
    expect(res.status).toBe(200);
    expect(res.body.recipe.version).toBe(2);
    expect(res.body.recipe.grinderSetting).toBe("6.0");
  });

  it("POST replaces wholesale: a parameter left out is cleared", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app).post(`/api/coffees/${id}/recipe`).send({ method: "V60 02" });
    expect(res.body.recipe).toMatchObject({ method: "V60 02", waterTempC: null, doseG: null });
  });

  it("PATCH edits a draft in place, without creating a version", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app)
      .patch(`/api/coffees/${id}/recipe`)
      .send({ grinderSetting: "5.8" });

    expect(res.status).toBe(200);
    expect(res.body.recipe).toMatchObject({
      version: 1,
      grinderSetting: "5.8",
      method: "Origami (Conical)", // untouched keys survive the merge
      waterTempC: 93,
    });
    const versions = await request(app).get(`/api/coffees/${id}/recipe/versions`);
    expect(versions.body).toHaveLength(1);
  });

  it("PATCH clears a parameter when it is sent as null", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app).patch(`/api/coffees/${id}/recipe`).send({ waterTempC: null });
    expect(res.body.recipe.waterTempC).toBeNull();
    expect(res.body.recipe.method).toBe("Origami (Conical)");
  });

  it("PATCH forks once the version has produced a brew, leaving it untouched", async () => {
    const { app, db } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const before = (await request(app).get(`/api/coffees/${id}`)).body.recipe;
    addBrew(db, id, before.id);

    const res = await request(app)
      .patch(`/api/coffees/${id}/recipe`)
      .send({ grinderSetting: "6.0", changeNote: "amargou, abri a moagem" });

    expect(res.body.recipe).toMatchObject({
      version: 2,
      kind: "tweak",
      changeNote: "amargou, abri a moagem",
      grinderSetting: "6.0",
      waterTempC: 93, // carried over from the frozen version
      brewCount: 0,
    });

    const v1 = (await request(app).get(`/api/coffees/${id}/recipe/versions/1`)).body;
    expect(v1).toMatchObject({ grinderSetting: "5.5", brewCount: 1, isCurrent: false });
    expect(v1.changeNote).toBeNull(); // the note describes the new version, not the old
  });

  it("keeps counting brews per version", async () => {
    const { app, db } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const v1 = (await request(app).get(`/api/coffees/${id}`)).body.recipe;
    addBrew(db, id, v1.id);
    addBrew(db, id, v1.id);
    await request(app).post(`/api/coffees/${id}/recipe`).send({ ...baseRecipe, doseG: 13 });
    const versions = (await request(app).get(`/api/coffees/${id}/recipe/versions`)).body;
    expect(versions.map((v: any) => [v.version, v.brewCount])).toEqual([
      [2, 0],
      [1, 2],
    ]);
  });

  it("honours an explicit baseline on a re-dial that resets several things", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app)
      .post(`/api/coffees/${id}/recipe`)
      .send({ method: "V60 02", doseG: 15, yieldG: 250, kind: "baseline", changeNote: "recomeço" });
    expect(res.body.recipe).toMatchObject({ version: 2, kind: "baseline" });
  });

  it("stores the new v2 fields", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, {
      ...baseRecipe,
      filter: "Cafec Abaca",
      drainTargetMinSec: 150,
      drainTargetMaxSec: 180,
    });
    expect((await request(app).get(`/api/coffees/${id}`)).body.recipe).toMatchObject({
      filter: "Cafec Abaca",
      drainTargetMinSec: 150,
      drainTargetMaxSec: 180,
    });
  });

  it("rejects a drain target range that runs backwards", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app)
      .post(`/api/coffees/${id}/recipe`)
      .send({ drainTargetMinSec: 200, drainTargetMaxSec: 150 });
    expect(res.status).toBe(400);
  });

  it("ignores the derived ratio when a client sends it back", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const res = await request(app)
      .post(`/api/coffees/${id}/recipe`)
      .send({ ...baseRecipe, ratio: 99, doseG: 12, yieldG: 180 });
    expect(res.status).toBe(201);
    expect(res.body.recipe.ratio).toBe(15); // recomputed, not echoed
  });

  it("PATCH on the coffee follows the same draft/frozen rule", async () => {
    const { app, db } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    const v1 = (await request(app).get(`/api/coffees/${id}`)).body.recipe;

    const draft = await request(app)
      .patch(`/api/coffees/${id}`)
      .send({ recipe: { doseG: 13 } });
    expect(draft.body.recipe).toMatchObject({ version: 1, doseG: 13 });

    addBrew(db, id, v1.id);
    const frozen = await request(app)
      .patch(`/api/coffees/${id}`)
      .send({ recipe: { doseG: 14 } });
    expect(frozen.body.recipe).toMatchObject({ version: 2, doseG: 14 });
  });

  it("creates the first version when a coffee had no recipe at all", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app);
    expect((await request(app).get(`/api/coffees/${id}`)).body.recipe).toBeNull();
    const res = await request(app).patch(`/api/coffees/${id}/recipe`).send({ method: "V60 02" });
    expect(res.body.recipe).toMatchObject({ version: 1, kind: "baseline", method: "V60 02" });
  });

  it("404s for an unknown coffee or version", async () => {
    const { app } = testApp();
    const id = await makeCoffee(app, baseRecipe);
    expect((await request(app).get(`/api/coffees/${id}/recipe/versions/7`)).status).toBe(404);
    expect((await request(app).get("/api/coffees/999/recipe/versions")).status).toBe(404);
    expect((await request(app).patch("/api/coffees/999/recipe").send({ doseG: 12 })).status).toBe(
      404
    );
  });
});
