import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers.js";

describe("backup export", () => {
  it("returns a JSON dump with settings and coffees as an attachment", async () => {
    const { app } = testApp();
    await request(app)
      .post("/api/coffees")
      .send({ name: "Backup me", initialUnit: { weightG: 200, initialState: "frozen" } });

    const res = await request(app).get("/api/backup");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.headers["content-disposition"]).toContain("coffeelog-backup-");
    expect(res.body.app).toBe("CoffeeLog");
    expect(res.body.settings.printerDevice).toBe("Niimbot B1");
    expect(res.body.coffees).toHaveLength(1);
    expect(res.body.coffees[0].units).toHaveLength(1);
  });
});
