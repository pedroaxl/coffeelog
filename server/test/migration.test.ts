import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDb } from "../src/db/connection.js";

const SCHEMA_V1 = fs.readFileSync(new URL("./fixtures/schema-v1.sql", import.meta.url), "utf8");

let dir: string;
let file: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "coffeelog-migration-"));
  file = path.join(dir, "coffeelog.db");
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Build a database with the v1 schema and a realistic spread of v1 data. */
function seedV1(): void {
  const db = new Database(file);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_V1);
  db.exec(`
    INSERT INTO coffees (id, name, roaster, score, created_at) VALUES
      (1, 'Azahar', 'Isso É Café', 5, '2026-06-01 10:00:00'),
      (2, 'Sem receita', 'Um Coffee', NULL, '2026-06-02 10:00:00'),
      (3, 'Duas receitas', 'Coffeelab', 4, '2026-06-03 10:00:00'),
      (4, 'Consumo desfeito', 'Mococa', NULL, '2026-06-04 10:00:00');

    INSERT INTO tasting_notes (coffee_id, label, position) VALUES (1, 'jasmim', 0), (1, 'mel', 1);
    INSERT INTO coffee_photos (coffee_id, path, position) VALUES (1, '/uploads/a.jpg', 0);

    INSERT INTO recipes (id, coffee_id, brew_type, method, dose_g, yield_g, water_temp_c,
                         grinder, grinder_setting, protocol, created_at) VALUES
      (10, 1, 'filter', 'Origami (Conical)', 12, 200, 93, '1Zpresso ZP6', '5.5',
       'Bloom 40 g / 40 s', '2026-06-05 09:00:00'),
      (11, 3, 'filter', 'V60 02', 15, 250, 92, '1Zpresso K-Ultra', '4.0', 'primeira', '2026-06-06 09:00:00'),
      (12, 3, 'filter', 'V60 02', 15, 250, 94, '1Zpresso K-Ultra', '4.2', 'segunda', '2026-06-07 09:00:00');

    INSERT INTO storage_units (id, coffee_id, kind, weight_g, qr_id, seal_state, temp_state, consumed)
      VALUES (20, 1, 'bag', 250, 'AAA111', 'open', 'defrosted', 0),
             (21, 1, 'tube', 20, 'BBB222', NULL, 'frozen', 1),
             (22, 4, 'bag', 340, 'CCC333', 'sealed', 'defrosted', 0);

    INSERT INTO consumption_log (id, unit_id, coffee_id, kind, grams_delta, notes, undone, created_at) VALUES
      (30, 20, 1, 'bag', 18, 'amargou no final, moer mais grosso', 0, '2026-06-10 08:00:00'),
      (31, 21, 1, 'tube', 20, NULL, 0, '2026-06-11 08:00:00'),
      (32, NULL, 1, 'bag', 18, 'unidade apagada, nota preservada', 0, '2026-06-12 08:00:00'),
      (33, 22, 4, 'bag', 18, 'esse consumo foi desfeito', 1, '2026-06-13 08:00:00'),
      (34, 20, 1, 'bag', 18, '   ', 0, '2026-06-14 08:00:00');
  `);
  db.close();
}

function open() {
  return createDb(file);
}

describe("v1 → v2 migration", () => {
  it("turns every v1 recipe into version 1 of its coffee, losing no field", () => {
    seedV1();
    const db = open();

    const r = db.prepare("SELECT * FROM recipe_versions WHERE id = 10").get() as any;
    expect(r).toMatchObject({
      coffee_id: 1,
      version: 1,
      kind: "baseline",
      change_note: "Imported from v1",
      brew_type: "filter",
      method: "Origami (Conical)",
      dose_g: 12,
      yield_g: 200,
      water_temp_c: 93,
      grinder: "1Zpresso ZP6",
      grinder_setting: "5.5",
      protocol: "Bloom 40 g / 40 s",
      created_at: "2026-06-05 09:00:00",
    });

    // The coffee points at it, and the legacy table is gone (renamed, not copied).
    const c = db.prepare("SELECT current_recipe_version_id AS p FROM coffees WHERE id = 1").get() as any;
    expect(c.p).toBe(10);
    expect(
      db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='recipes'").get()
    ).toBeUndefined();
    db.close();
  });

  it("numbers a coffee that somehow holds several recipes and points at the newest", () => {
    seedV1();
    const db = open();
    const rows = db
      .prepare("SELECT id, version FROM recipe_versions WHERE coffee_id = 3 ORDER BY id")
      .all() as any[];
    expect(rows).toEqual([
      { id: 11, version: 1 },
      { id: 12, version: 2 },
    ]);
    const c = db.prepare("SELECT current_recipe_version_id AS p FROM coffees WHERE id = 3").get() as any;
    expect(c.p).toBe(12);
    db.close();
  });

  it("leaves a coffee with no recipe without a version or a pointer", () => {
    seedV1();
    const db = open();
    expect(db.prepare("SELECT COUNT(*) AS n FROM recipe_versions WHERE coffee_id = 2").get()).toEqual({ n: 0 });
    const c = db.prepare("SELECT current_recipe_version_id AS p FROM coffees WHERE id = 2").get() as any;
    expect(c.p).toBeNull();
    db.close();
  });

  it("imports consumption notes as legacy brews, and nothing else", () => {
    seedV1();
    const db = open();
    const brews = db.prepare("SELECT * FROM brews ORDER BY id").all() as any[];
    // 30 and 32 have notes; 31 has none, 33 was undone, 34 is whitespace only.
    expect(brews.map((b) => b.consumption_log_id)).toEqual([30, 32]);
    expect(brews[0]).toMatchObject({
      coffee_id: 1,
      unit_id: 20,
      recipe_version_id: null,
      brewed_at: "2026-06-10 08:00:00",
      notes: "amargou no final, moer mais grosso",
      valid_for_dial_in: 0,
    });
    // The unit was gone from the log row; the note survives anyway.
    expect(brews[1]).toMatchObject({ unit_id: null, notes: "unidade apagada, nota preservada" });
    db.close();
  });

  it("carries every v1 row across untouched", () => {
    seedV1();
    const before = new Database(file);
    const count = (t: string) => (before.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as any).n;
    const counts = {
      coffees: count("coffees"),
      recipes: count("recipes"),
      units: count("storage_units"),
      notes: count("tasting_notes"),
      photos: count("coffee_photos"),
      log: count("consumption_log"),
    };
    before.close();

    const db = open();
    const after = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as any).n;
    expect(after("coffees")).toBe(counts.coffees);
    expect(after("recipe_versions")).toBe(counts.recipes);
    expect(after("storage_units")).toBe(counts.units);
    expect(after("tasting_notes")).toBe(counts.notes);
    expect(after("coffee_photos")).toBe(counts.photos);
    expect(after("consumption_log")).toBe(counts.log);
    db.close();
  });

  it("is idempotent across restarts", () => {
    seedV1();
    let db = open();
    const snapshot = () => ({
      versions: db.prepare("SELECT id, version, kind, change_note FROM recipe_versions ORDER BY id").all(),
      brews: db.prepare("SELECT id, consumption_log_id, notes FROM brews ORDER BY id").all(),
      pointers: db.prepare("SELECT id, current_recipe_version_id AS p FROM coffees ORDER BY id").all(),
    });
    const first = snapshot();
    db.close();

    db = open();
    expect(snapshot()).toEqual(first);
    db.close();

    db = open();
    expect(snapshot()).toEqual(first);
    db.close();
  });

  it("does not resurrect an imported brew the user deleted", () => {
    seedV1();
    let db = open();
    db.prepare("DELETE FROM brews WHERE consumption_log_id = 30").run();
    db.close();

    db = open();
    const brews = db.prepare("SELECT consumption_log_id AS c FROM brews").all() as any[];
    expect(brews.map((b) => b.c)).toEqual([32]);
    db.close();
  });

  it("does not overwrite a changeNote written after the migration", () => {
    seedV1();
    let db = open();
    db.prepare("UPDATE recipe_versions SET change_note = 'abri a moagem', kind = 'tweak' WHERE id = 10").run();
    db.close();

    db = open();
    const r = db.prepare("SELECT change_note AS n, kind AS k FROM recipe_versions WHERE id = 10").get() as any;
    expect(r).toEqual({ n: "abri a moagem", k: "tweak" });
    db.close();
  });

  it("picks up recipes written by a v1 build after a downgrade, parking its table", () => {
    seedV1();
    let db = open();
    db.close();

    // A v1 binary running against the upgraded file would recreate `recipes`
    // (CREATE TABLE IF NOT EXISTS) and write into it.
    const v1 = new Database(file);
    v1.exec(`
      CREATE TABLE recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coffee_id INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
        brew_type TEXT, method TEXT, dose_g REAL, yield_g REAL, water_temp_c REAL,
        grinder TEXT, grinder_setting TEXT, protocol TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO recipes (id, coffee_id, method, dose_g, protocol, created_at)
        VALUES (99, 2, 'Hario Switch', 14, 'escrita durante o downgrade', '2026-07-01 09:00:00');
    `);
    v1.close();

    db = open();
    const r = db
      .prepare("SELECT * FROM recipe_versions WHERE protocol = 'escrita durante o downgrade'")
      .get() as any;
    expect(r).toMatchObject({
      coffee_id: 2,
      method: "Hario Switch",
      version: 1,
      kind: "baseline",
      change_note: "Imported from v1",
    });
    const c = db.prepare("SELECT current_recipe_version_id AS p FROM coffees WHERE id = 2").get() as any;
    expect(c.p).toBe(r.id);
    // The old table is parked, never dropped.
    expect(
      db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='recipes_v1_backup'").get()
    ).toBeDefined();
    expect(
      db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='recipes'").get()
    ).toBeUndefined();
    db.close();
  });

  it("keeps a downgraded build's recipe even when its id collides", () => {
    seedV1();
    let db = open();
    db.close();

    // A recreated v1 table restarts its id sequence, so this row claims id 10 —
    // already taken by Azahar's imported recipe. Matching on id would silently
    // skip it; the rows are taken across under fresh ids instead.
    const v1 = new Database(file);
    v1.exec(`
      CREATE TABLE recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coffee_id INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
        brew_type TEXT, method TEXT, dose_g REAL, yield_g REAL, water_temp_c REAL,
        grinder TEXT, grinder_setting TEXT, protocol TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO recipes (id, coffee_id, method, protocol)
        VALUES (10, 1, 'V60 02', 'colisao de id');
    `);
    v1.close();

    db = open();
    const rows = db
      .prepare("SELECT id, version, protocol FROM recipe_versions WHERE coffee_id = 1 ORDER BY version")
      .all() as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 10, version: 1, protocol: "Bloom 40 g / 40 s" });
    expect(rows[1]).toMatchObject({ version: 2, protocol: "colisao de id" });
    expect(rows[1].id).not.toBe(10);
    const c = db.prepare("SELECT current_recipe_version_id AS p FROM coffees WHERE id = 1").get() as any;
    expect(c.p).toBe(rows[1].id);
    db.close();
  });

  it("repairs a duplicate version number instead of failing to boot", () => {
    // The unique (coffee_id, version) index cannot be created while a duplicate
    // exists, and a database that cannot create its index is one that won't open.
    let db = open();
    db.prepare("INSERT INTO coffees (id, name) VALUES (1, 'X')").run();
    db.prepare("INSERT INTO recipe_versions (id, coffee_id, version) VALUES (50, 1, 1)").run();
    db.prepare("INSERT INTO recipe_versions (id, coffee_id, version) VALUES (51, 1, 2)").run();
    db.exec("DROP INDEX idx_recipe_versions_number");
    db.prepare("UPDATE recipe_versions SET version = 1 WHERE id = 51").run();
    db.close();

    db = open();
    expect(
      db.prepare("SELECT id, version FROM recipe_versions ORDER BY id").all()
    ).toEqual([
      { id: 50, version: 1 },
      { id: 51, version: 2 },
    ]);
    expect(
      db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_recipe_versions_number'").get()
    ).toBeDefined();
    db.close();
  });

  it("upgrades a database created before v1's own late columns", () => {
    const old = new Database(file);
    old.exec(SCHEMA_V1);
    old.exec("ALTER TABLE recipes DROP COLUMN brew_type");
    old.exec("ALTER TABLE settings DROP COLUMN process_options");
    old.exec("INSERT INTO coffees (id, name) VALUES (1, 'Antigo')");
    old.exec("INSERT INTO recipes (id, coffee_id, method) VALUES (10, 1, 'V60 02')");
    old.close();

    const db = open();
    const r = db.prepare("SELECT * FROM recipe_versions WHERE id = 10").get() as any;
    expect(r).toMatchObject({ method: "V60 02", brew_type: null, version: 1, kind: "baseline" });
    db.close();
  });
});

describe("fresh database", () => {
  it("creates the v2 shape and seeds the filter options", () => {
    const db = open();
    for (const t of ["coffees", "recipe_versions", "brews", "storage_units", "settings"]) {
      expect(db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`).get(t)).toBeDefined();
    }
    const s = db.prepare("SELECT filter_options AS f FROM settings WHERE id = 1").get() as any;
    expect(JSON.parse(s.f)).toContain("Cafec Abaca");
    db.close();
  });

  it("enforces one version number per coffee", () => {
    const db = open();
    db.prepare("INSERT INTO coffees (id, name) VALUES (1, 'X')").run();
    db.prepare("INSERT INTO recipe_versions (coffee_id, version) VALUES (1, 1)").run();
    expect(() =>
      db.prepare("INSERT INTO recipe_versions (coffee_id, version) VALUES (1, 1)").run()
    ).toThrow();
    db.close();
  });
});
