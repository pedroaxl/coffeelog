import Database from "better-sqlite3";
import {
  SCHEMA_SQL,
  DEFAULT_METHOD_OPTIONS,
  DEFAULT_GRINDER_OPTIONS,
  DEFAULT_VARIETY_OPTIONS,
  DEFAULT_PROCESS_OPTIONS,
} from "./schema.js";

export type Db = Database.Database;

/**
 * Create (or open) a CoffeeLog database, apply the schema, run lightweight
 * migrations, and ensure the single settings row exists. Pass ":memory:" for
 * tests. Dependency-injected into the Express app so route handlers never reach
 * for a global connection.
 */
export function createDb(path: string): Db {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  migrate(db);
  seedSettings(db);
  return db;
}

/** Add columns introduced after a database may already have been created. */
function migrate(db: Db): void {
  const cols = new Set(
    (db.prepare("PRAGMA table_info(settings)").all() as { name: string }[]).map((c) => c.name)
  );
  const ensure = (name: string, ddl: string) => {
    if (!cols.has(name)) db.exec(`ALTER TABLE settings ADD COLUMN ${ddl}`);
  };
  ensure("variety_options", "variety_options TEXT NOT NULL DEFAULT '[]'");
  ensure("process_options", "process_options TEXT NOT NULL DEFAULT '[]'");

  // Move any existing single photo into the coffee_photos table (idempotent).
  db.exec(`
    INSERT INTO coffee_photos (coffee_id, path, position)
    SELECT id, photo_path, 0 FROM coffees
    WHERE photo_path IS NOT NULL AND photo_path <> ''
      AND id NOT IN (SELECT coffee_id FROM coffee_photos)
  `);
}

function seedSettings(db: Db): void {
  const existing = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!existing) {
    db.prepare(
      `INSERT INTO settings (id, method_options, grinder_options, variety_options, process_options)
       VALUES (1, @methods, @grinders, @varieties, @processes)`
    ).run({
      methods: JSON.stringify(DEFAULT_METHOD_OPTIONS),
      grinders: JSON.stringify(DEFAULT_GRINDER_OPTIONS),
      varieties: JSON.stringify(DEFAULT_VARIETY_OPTIONS),
      processes: JSON.stringify(DEFAULT_PROCESS_OPTIONS),
    });
    return;
  }
  // Populate option lists that are newly added (empty) on an existing database.
  const row = db
    .prepare("SELECT variety_options, process_options FROM settings WHERE id = 1")
    .get() as { variety_options: string; process_options: string };
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
}
