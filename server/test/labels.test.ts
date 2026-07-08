import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers.js";
import { buildQrUrl } from "../src/services/labels.js";
import type { Settings } from "../src/repos/settings.js";

const baseSettings: Settings = {
  instanceUrl: "",
  warnNotFrozenAfterDays: 3,
  warnFrozenOverDays: 40,
  labelWidthMm: 40,
  labelHeightMm: 30,
  labelDpi: 300,
  weightUnit: "g",
  printerDevice: "Niimbot B1",
  methodOptions: [],
  grinderOptions: [],
};

async function seedTube(app: import("express").Express) {
  const created = await request(app)
    .post("/api/coffees")
    .send({ name: "Sítio", roaster: "Coffeelab", initialUnit: { weightG: 250, initialState: "open" } });
  const bagId = created.body.units[0].id;
  const portioned = await request(app)
    .post(`/api/units/${bagId}/portion`)
    .send({ tubes: [{ weightG: 20 }], tubeState: "frozen" });
  const tube = portioned.body.units.find((u: { kind: string }) => u.kind === "tube");
  return { coffeeId: created.body.id, tube };
}

describe("buildQrUrl", () => {
  it("prefers the instance URL and adds a scheme when missing", () => {
    expect(buildQrUrl({ ...baseSettings, instanceUrl: "192.168.0.12:8080" }, "", "A4F2K7")).toBe(
      "http://192.168.0.12:8080/u/A4F2K7"
    );
  });
  it("falls back to the request origin", () => {
    expect(buildQrUrl(baseSettings, "http://host:8080", "A4F2K7")).toBe("http://host:8080/u/A4F2K7");
  });
});

describe("label rendering", () => {
  it("renders a PNG for a unit at the configured size", async () => {
    const { app } = testApp();
    const { tube } = await seedTube(app);
    const res = await request(app).get(`/api/labels/unit/${tube.id}.png`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    // PNG magic bytes
    expect(res.body.slice(0, 4).toString("hex")).toBe("89504e47");
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it("exports a single unit as a PNG and multiple as a ZIP", async () => {
    const { app } = testApp();
    const { tube } = await seedTube(app);
    const single = await request(app).get(`/api/labels/export?ids=${tube.id}`);
    expect(single.headers["content-type"]).toContain("image/png");

    // portion another tube so we have two ids
    const coffee = (await request(app).get(`/api/coffees/${tube.coffeeId ?? 1}`)).body;
    const bag = coffee.units.find((u: { kind: string }) => u.kind === "bag");
    const more = await request(app)
      .post(`/api/units/${bag.id}/portion`)
      .send({ tubes: [{ weightG: 15 }], tubeState: "frozen" });
    const tube2 = more.body.units.find(
      (u: { kind: string; weightG: number }) => u.kind === "tube" && u.weightG === 15
    );
    const zip = await request(app).get(`/api/labels/export?ids=${tube.id},${tube2.id}`);
    expect(zip.headers["content-type"]).toContain("application/zip");
    expect(zip.headers["content-disposition"]).toContain("coffeelog-labels.zip");
  });
});

describe("scan resolution", () => {
  it("resolves a qrId to its unit + coffee", async () => {
    const { app } = testApp();
    const { tube } = await seedTube(app);
    const res = await request(app).get(`/api/scan/${tube.qrId}`);
    expect(res.status).toBe(200);
    expect(res.body.unit.id).toBe(tube.id);
    expect(res.body.coffee.name).toBe("Sítio");
  });

  it("404s an unknown qrId", async () => {
    const { app } = testApp();
    expect((await request(app).get("/api/scan/ZZZZZZ")).status).toBe(404);
  });
});
