import Database from "better-sqlite3";
import {
  SCHEMA_SQL,
  DEFAULT_METHOD_OPTIONS,
  DEFAULT_GRINDER_OPTIONS,
} from "./schema.js";

export type Db = Database.Database;

/**
 * Create (or open) a CoffeeLog database, apply the schema, and ensure the single
 * settings row exists. Pass ":memory:" for tests. Dependency-injected into the
 * Express app so route handlers never reach for a global connection.
 */
export function createDb(path: string): Db {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  seedSettings(db);
  return db;
}

function seedSettings(db: Db): void {
  const existing = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!existing) {
    db.prepare(
      `INSERT INTO settings (id, method_options, grinder_options)
       VALUES (1, @methods, @grinders)`
    ).run({
      methods: JSON.stringify(DEFAULT_METHOD_OPTIONS),
      grinders: JSON.stringify(DEFAULT_GRINDER_OPTIONS),
    });
  }
}
