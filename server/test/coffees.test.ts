import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers.js";

function newCoffeePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Sítio da Torre",
    roaster: "Coffeelab",
    process: "Natural",
    variety: "Catuaí Amarelo",
    beanRegion: "Carmo de Minas",
    beanCountry: "Brazil",
    tastingNotes: ["Caramel", "Cherry"],
    initialUnit: { weightG: 250, initialState: "frozen" as const },
    ...overrides,
  };
}

describe("coffees CRUD", () => {
  it("creates a coffee with an initial frozen bag and derives stock", async () => {
    const { app } = testApp();
    const res = await request(app).post("/api/coffees").send(newCoffeePayload());
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Sítio da Torre");
    expect(res.body.tastingNotes).toEqual(["Caramel", "Cherry"]);
    expect(res.body.score).toBeNull(); // no first-brew gate, but unset by default
    expect(res.body.status).toBe("available");
    expect(res.body.remainingG).toBe(250);
    expect(res.body.activeUnitCount).toBe(1);
    const bag = res.body.units[0];
    expect(bag.kind).toBe("bag");
    expect(bag.status).toBe("frozen");
    expect(bag.tempState).toBe("frozen");
    expect(bag.qrId).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("maps an 'open' initial bag to open+defrosted with an opened date", async () => {
    const { app } = testApp();
    const res = await request(app)
      .post("/api/coffees")
      .send(newCoffeePayload({ initialUnit: { weightG: 200, initialState: "open" } }));
    const bag = res.body.units[0];
    expect(bag.sealState).toBe("open");
    expect(bag.tempState).toBe("defrosted");
    expect(bag.status).toBe("open");
    expect(bag.openedDate).not.toBeNull();
  });

  it("derives the recipe ratio from yield/dose", async () => {
    const { app } = testApp();
    const res = await request(app)
      .post("/api/coffees")
      .send(newCoffeePayload({ recipe: { method: "V60 02", doseG: 15, yieldG: 250 } }));
    expect(res.body.recipe.ratio).toBe(16.7);
    expect(res.body.recipe.method).toBe("V60 02");
  });

  it("sets and clears the score anytime", async () => {
    const { app } = testApp();
    const created = await request(app).post("/api/coffees").send(newCoffeePayload());
    const id = created.body.id;

    const scored = await request(app).patch(`/api/coffees/${id}/score`).send({ score: 5 });
    expect(scored.body.score).toBe(5);

    const cleared = await request(app).patch(`/api/coffees/${id}/score`).send({ score: null });
    expect(cleared.body.score).toBeNull();
  });

  it("updates fields, notes and recipe together", async () => {
    const { app } = testApp();
    const created = await request(app).post("/api/coffees").send(newCoffeePayload());
    const id = created.body.id;
    const res = await request(app)
      .patch(`/api/coffees/${id}`)
      .send({ roaster: "Isso é Café", tastingNotes: ["Jasmine"], recipe: { grinder: "1Zpresso ZP6" } });
    expect(res.body.roaster).toBe("Isso é Café");
    expect(res.body.tastingNotes).toEqual(["Jasmine"]);
    expect(res.body.recipe.grinder).toBe("1Zpresso ZP6");
  });

  it("lists and deletes", async () => {
    const { app } = testApp();
    const created = await request(app).post("/api/coffees").send(newCoffeePayload());
    const list = await request(app).get("/api/coffees");
    expect(list.body).toHaveLength(1);

    const del = await request(app).delete(`/api/coffees/${created.body.id}`);
    expect(del.status).toBe(204);
    const after = await request(app).get("/api/coffees");
    expect(after.body).toHaveLength(0);
  });

  it("rejects invalid payloads and 404s unknown ids", async () => {
    const { app } = testApp();
    expect((await request(app).post("/api/coffees").send({ roaster: "x" })).status).toBe(400);
    expect((await request(app).get("/api/coffees/999")).status).toBe(404);
    expect((await request(app).patch("/api/coffees/999/score").send({ score: 3 })).status).toBe(404);
  });
});
