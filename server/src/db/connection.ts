import Database from "better-sqlite3";
import {
  SCHEMA_SQL,
  DEFAULT_METHOD_OPTIONS,
  DEFAULT_GRINDER_OPTIONS,
  DEFAULT_VARIETY_OPTIONS,
  DEFAULT_PROCESS_OPTIONS,
  DEFAULT_FILTER_OPTIONS,
} from "./schema.js";

export type Db = Database.Database;

/**
 * Create (or open) a CoffeeLog database, apply the schema, run lightweight
 * migrations, and ensure the single settings row exists. Pass ":memory:" for
 * tests. Dependency-injected into the Express app so route handlers never reach
 * for a global connection.
 *
 * Order matters: a pre-v2 database is reshaped *before* the schema is applied,
 * because `CREATE TABLE IF NOT EXISTS recipe_versions` would otherwise create an
 * empty table alongside the legacy `recipes` one and hide the real data.
 */
export function createDb(path: string): Db {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  upgradeLegacySchema(db);
  db.exec(SCHEMA_SQL);
  migrate(db);
  seedSettings(db);
  return db;
}

function tableExists(db: Db, table: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
}

/** Add a column introduced after a database may already have been created. */
function ensureColumn(db: Db, table: string, column: string, ddl: string): void {
  if (!tableExists(db, table)) return;
  const cols = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
  );
  if (!cols.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

/**
 * Run a data migration exactly once, ever. Column adds and backfills can be made
 * idempotent by construction, but importing rows cannot: re-running it would
 * resurrect records the user has since deleted. Recorded in the same transaction
 * as the work, so a crash mid-migration rolls the whole thing back.
 */
function once(db: Db, name: string, work: () => void): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applied_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const done = db.prepare("SELECT 1 FROM applied_migrations WHERE name = ?").get(name);
  if (done) return;
  db.transaction(() => {
    work();
    db.prepare("INSERT INTO applied_migrations (name) VALUES (?)").run(name);
  })();
}

/** The columns v2 adds to the (renamed) recipe table and to coffees. */
function ensureRecipeVersionColumns(db: Db): void {
  // v1's own late-added column: a database created before it may lack it.
  ensureColumn(db, "recipe_versions", "brew_type", "brew_type TEXT");
  ensureColumn(db, "recipe_versions", "version", "version INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "recipe_versions", "change_note", "change_note TEXT");
  ensureColumn(db, "recipe_versions", "kind", "kind TEXT NOT NULL DEFAULT 'tweak'");
  ensureColumn(db, "recipe_versions", "filter_name", "filter_name TEXT");
  ensureColumn(db, "recipe_versions", "drain_target_min_sec", "drain_target_min_sec INTEGER");
  ensureColumn(db, "recipe_versions", "drain_target_max_sec", "drain_target_max_sec INTEGER");
  ensureColumn(db, "recipe_versions", "superseded_at", "superseded_at TEXT");
  ensureColumn(
    db,
    "coffees",
    "current_recipe_version_id",
    "current_recipe_version_id INTEGER REFERENCES recipe_versions(id) ON DELETE SET NULL"
  );
}

/**
 * Renumber the versions of any coffee that holds two rows claiming the same
 * number, in id order. v1 allowed at most one recipe per coffee, so this is a
 * no-op on a normal database — but the schema's unique (coffee_id, version)
 * index cannot be created while a duplicate exists, and a database that cannot
 * create its index is a database that will not boot. Cheap insurance, run on
 * every start, before the schema is applied.
 */
function repairVersionNumbers(db: Db): void {
  if (!tableExists(db, "recipe_versions")) return;
  const cols = new Set(
    (db.prepare("PRAGMA table_info(recipe_versions)").all() as { name: string }[]).map(
      (c) => c.name
    )
  );
  if (!cols.has("version")) return;
  db.exec(`
    UPDATE recipe_versions
       SET version = (
         SELECT n FROM (
           SELECT id, ROW_NUMBER() OVER (PARTITION BY coffee_id ORDER BY id) AS n
           FROM recipe_versions
         ) t WHERE t.id = recipe_versions.id
       )
     WHERE coffee_id IN (
       SELECT coffee_id FROM recipe_versions GROUP BY coffee_id, version HAVING COUNT(*) > 1
     )
  `);
}

/** A row of the v1 `recipes` table. Columns a very old database may lack read as undefined. */
interface LegacyRecipeRow {
  id: number;
  coffee_id: number;
  brew_type?: string | null;
  method?: string | null;
  dose_g?: number | null;
  yield_g?: number | null;
  water_temp_c?: number | null;
  grinder?: string | null;
  grinder_setting?: string | null;
  protocol?: string | null;
  created_at?: string | null;
}

/** Pick a free name so a parked table never overwrites an earlier one. */
function freeTableName(db: Db, base: string): string {
  let name = base;
  for (let n = 2; tableExists(db, name); n++) name = `${base}_${n}`;
  return name;
}

/**
 * Bring a v1 database up to the shape SCHEMA_SQL declares. Runs before the
 * schema is applied; a fresh database falls straight through.
 *
 * v1 kept one recipe per coffee in a table that was already 1:N-ready, so
 * versioning is that table renamed and extended — no data is copied or dropped.
 *
 * Deliberately *not* recorded as a one-shot migration: downgrading to a v1 build
 * would recreate an empty `recipes` table and write new recipes into it, and a
 * one-shot guard would then leave those rows stranded on the way back up. Every
 * step here is idempotent, so it can keep watch on every boot.
 */
function upgradeLegacySchema(db: Db): void {
  liftLegacyRecipes(db);
  repairVersionNumbers(db);
}

function liftLegacyRecipes(db: Db): void {
  if (!tableExists(db, "recipes")) return; // fresh or already-upgraded database

  // A database created before v1's brew_type column lacks it; add it first so
  // either path below can read a complete row.
  ensureColumn(db, "recipes", "brew_type", "brew_type TEXT");

  db.transaction(() => {
    let imported: number[];

    if (!tableExists(db, "recipe_versions")) {
      // The ordinary path: the v1 table *becomes* the version table. A rename
      // moves the rows without copying them, so there is no window in which the
      // data exists in only one of two places.
      imported = (db.prepare("SELECT id FROM recipes").all() as { id: number }[]).map(
        (r) => r.id
      );
      db.exec("ALTER TABLE recipes RENAME TO recipe_versions");
      ensureRecipeVersionColumns(db);
    } else {
      // Both tables present — a downgrade-then-upgrade, or a hand-edited
      // database. Take every legacy row across as a *new* version and park the
      // old table under a free name instead of dropping it.
      //
      // The rows get fresh ids on purpose. A v1 build recreating `recipes` also
      // restarts its id sequence, so a legacy id can collide with an unrelated
      // version already here; matching on id would then silently skip a real
      // recipe. Nothing points at these ids yet (brews reference the version
      // rows that stay put), so reassigning them costs nothing. Re-importing is
      // impossible because the source table is renamed away in this same
      // transaction.
      ensureRecipeVersionColumns(db);
      const legacy = db.prepare("SELECT * FROM recipes ORDER BY id").all() as LegacyRecipeRow[];
      const highest = db.prepare(
        "SELECT COALESCE(MAX(version), 0) AS v FROM recipe_versions WHERE coffee_id = ?"
      );
      const insert = db.prepare(`
        INSERT INTO recipe_versions
          (coffee_id, version, brew_type, method, dose_g, yield_g, water_temp_c,
           grinder, grinder_setting, protocol, created_at)
        VALUES (@coffeeId, @version, @brewType, @method, @doseG, @yieldG, @waterTempC,
                @grinder, @grinderSetting, @protocol, @createdAt)
      `);
      // Each row continues its coffee's numbering. Computed here rather than in
      // SQL because the version column is uniquely indexed: a batch that all
      // defaulted to 1 would collide before any repair pass could renumber it.
      const nextFor = new Map<number, number>();
      imported = [];
      for (const row of legacy) {
        const coffeeId = row.coffee_id;
        const version = (nextFor.get(coffeeId) ?? (highest.get(coffeeId) as { v: number }).v) + 1;
        nextFor.set(coffeeId, version);
        const info = insert.run({
          coffeeId,
          version,
          brewType: row.brew_type ?? null,
          method: row.method ?? null,
          doseG: row.dose_g ?? null,
          yieldG: row.yield_g ?? null,
          waterTempC: row.water_temp_c ?? null,
          grinder: row.grinder ?? null,
          grinderSetting: row.grinder_setting ?? null,
          protocol: row.protocol ?? null,
          createdAt: row.created_at ?? new Date().toISOString().slice(0, 19).replace("T", " "),
        });
        imported.push(Number(info.lastInsertRowid));
      }
      db.exec(`ALTER TABLE recipes RENAME TO ${freeTableName(db, "recipes_v1_backup")}`);
    }

    if (imported.length === 0) return;
    const ids = imported.join(",");

    // Mark exactly the rows lifted in this pass: they are v1 recipes, which
    // means a reset rather than a dial-in step. Scoping it to those ids keeps a
    // real changeNote written later from ever being overwritten.
    db.exec(`
      UPDATE recipe_versions
         SET kind = 'baseline',
             change_note = COALESCE(change_note, 'Imported from v1')
       WHERE id IN (${ids})
    `);

    // Lifted rows all carry the default version 1, so a coffee holding more
    // than one needs numbering before the pointer below can pick the newest.
    repairVersionNumbers(db);

    // Point each affected coffee at its newest version. On the ordinary path
    // every pointer is null anyway; on the downgrade path this is what picks up
    // a recipe edited while the v1 build was running.
    db.exec(`
      UPDATE coffees
         SET current_recipe_version_id = (
           SELECT rv.id FROM recipe_versions rv
            WHERE rv.coffee_id = coffees.id
            ORDER BY rv.version DESC, rv.id DESC LIMIT 1
         )
       WHERE id IN (SELECT coffee_id FROM recipe_versions WHERE id IN (${ids}))
    `);
  })();
}

/** Column adds and backfills that are safe to re-run on every boot. */
function migrate(db: Db): void {
  ensureColumn(db, "settings", "variety_options", "variety_options TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "settings", "process_options", "process_options TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "settings", "filter_options", "filter_options TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(
    db,
    "coffees",
    "current_recipe_version_id",
    "current_recipe_version_id INTEGER REFERENCES recipe_versions(id) ON DELETE SET NULL"
  );

  // Move any existing single photo into the coffee_photos table (idempotent).
  db.exec(`
    INSERT INTO coffee_photos (coffee_id, path, position)
    SELECT id, photo_path, 0 FROM coffees
    WHERE photo_path IS NOT NULL AND photo_path <> ''
      AND id NOT IN (SELECT coffee_id FROM coffee_photos)
  `);

  // A coffee with recipe versions always points at one — repair a pointer left
  // null by the upgrade above or by a partially written v1 row. Note for later:
  // this makes "null pointer" unusable as a way to say "this coffee's recipe was
  // cleared but keep the history" — that would need its own marker.
  db.exec(`
    UPDATE coffees
       SET current_recipe_version_id = (
         SELECT rv.id FROM recipe_versions rv
          WHERE rv.coffee_id = coffees.id
          ORDER BY rv.version DESC, rv.id DESC LIMIT 1
       )
     WHERE current_recipe_version_id IS NULL
       AND EXISTS (SELECT 1 FROM recipe_versions rv WHERE rv.coffee_id = coffees.id)
  `);

  // v1's only record of how a cup went was a free-text note on a consumption
  // event. They become brews so the history is in one place — but they predate
  // versioning and carry no parameters, so they point at no recipe version and
  // are excluded from dial-in comparisons. Undone consumes never happened.
  once(db, "v2-import-consumption-notes", () => {
    db.exec(`
      INSERT INTO brews
        (coffee_id, unit_id, consumption_log_id, brewed_at, notes, valid_for_dial_in,
         discard_reason, created_at)
      SELECT cl.coffee_id, cl.unit_id, cl.id, cl.created_at, cl.notes, 0,
             'Imported from v1 — no recipe or parameters recorded', cl.created_at
        FROM consumption_log cl
       WHERE cl.undone = 0
         AND cl.notes IS NOT NULL
         AND TRIM(cl.notes) <> ''
         AND NOT EXISTS (SELECT 1 FROM brews b WHERE b.consumption_log_id = cl.id)
    `);
  });
}

function seedSettings(db: Db): void {
  const existing = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!existing) {
    db.prepare(
      `INSERT INTO settings (id, method_options, grinder_options, variety_options,
                             process_options, filter_options)
       VALUES (1, @methods, @grinders, @varieties, @processes, @filters)`
    ).run({
      methods: JSON.stringify(DEFAULT_METHOD_OPTIONS),
      grinders: JSON.stringify(DEFAULT_GRINDER_OPTIONS),
      varieties: JSON.stringify(DEFAULT_VARIETY_OPTIONS),
      processes: JSON.stringify(DEFAULT_PROCESS_OPTIONS),
      filters: JSON.stringify(DEFAULT_FILTER_OPTIONS),
    });
    return;
  }
  // Populate option lists that are newly added (empty) on an existing database.
  const row = db
    .prepare("SELECT variety_options, process_options, filter_options FROM settings WHERE id = 1")
    .get() as { variety_options: string; process_options: string; filter_options: string };
  if (row.variety_options === "[]") {
    db.prepare("UPDATE settings SET variety_options = ? WHERE id = 1").run(
      JSON.stringify(DEFAULT_VARIETY_OPTIONS)
    );
  }
  if (row.process_options === "[]") {
    db.prepare("UPDATE settings SET process_options = ? WHERE id = 1").run(
      JSON.stringify(DEFAULT_PROCESS_OPTIONS)
    );
  }
  if (row.filter_options === "[]") {
    db.prepare("UPDATE settings SET filter_options = ? WHERE id = 1").run(
      JSON.stringify(DEFAULT_FILTER_OPTIONS)
    );
  }
}
