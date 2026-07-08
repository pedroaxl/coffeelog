import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createDb } from "./db/connection.js";
import { buildApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
// In the built image this file is server/dist/index.js and web is copied to server/web.
const WEB_DIST = path.resolve(__dirname, "../web");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = createDb(path.join(DATA_DIR, "coffeelog.db"));
const app = buildApp(db, { webDist: WEB_DIST, uploadsDir: UPLOADS_DIR });

app.listen(PORT, () => {
  console.log(`CoffeeLog server listening on http://0.0.0.0:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
