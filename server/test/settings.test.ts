import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers.js";
import { DEFAULT_METHOD_OPTIONS, DEFAULT_GRINDER_OPTIONS } from "../src/db/schema.js";

describe("health", () => {
  it("responds ok", async () => {
    const { app } = testApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("settings", () => {
  it("seeds the real default method + grinder options", async () => {
    const { app } = testApp();
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(200);
    expect(res.body.methodOptions).toEqual(DEFAULT_METHOD_OPTIONS);
    expect(res.body.grinderOptions).toEqual(DEFAULT_GRINDER_OPTIONS);
    expect(res.body.printerDevice).toBe("Niimbot B1");
    expect(res.body.warnNotFrozenAfterDays).toBe(3);
    expect(res.body.warnFrozenOverDays).toBe(40);
  });

  it("updates thresholds and option lists", async () => {
    const { app } = testApp();
    const res = await request(app)
      .patch("/api/settings")
      .send({ warnFrozenOverDays: 30, methodOptions: ["V60 02", "Kalita"] });
    expect(res.status).toBe(200);
    expect(res.body.warnFrozenOverDays).toBe(30);
    expect(res.body.methodOptions).toEqual(["V60 02", "Kalita"]);
    // unchanged fields persist
    expect(res.body.warnNotFrozenAfterDays).toBe(3);
  });

  it("rejects unknown fields", async () => {
    const { app } = testApp();
    const res = await request(app).patch("/api/settings").send({ bogus: 1 });
    expect(res.status).toBe(400);
  });
});
