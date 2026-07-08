import { createDb } from "../src/db/connection.js";
import { buildApp } from "../src/app.js";

/** Build an Express app backed by a fresh in-memory database for a test. */
export function testApp() {
  const db = createDb(":memory:");
  const app = buildApp(db);
  return { db, app };
}
