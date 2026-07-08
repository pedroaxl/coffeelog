import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createDb } from "./db/connection.js";
import { buildApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Locate the built web app. Both production layouts are supported:
//  - Docker image: web/dist is copied next to the server as server/web
//  - Native install: `npm run build` leaves it at <repo>/web/dist (server at <repo>/server/dist)
const WEB_CANDIDATES = [
  path.resolve(__dirname, "../web"),
  path.resolve(__dirname, "../../web/dist"),
];
const WEB_DIST = WEB_CANDIDATES.find((p) => fs.existsSync(path.join(p, "index.html")));

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = createDb(path.join(DATA_DIR, "coffeelog.db"));
const app = buildApp(db, { webDist: WEB_DIST, uploadsDir: UPLOADS_DIR });

app.listen(PORT, () => {
  console.log(`CoffeeLog server listening on http://0.0.0.0:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  if (WEB_DIST) {
    console.log(`Serving web app from: ${WEB_DIST}`);
  } else {
    console.warn(
      "WARNING: no built web app found (looked for web/dist). The API works but " +
        "the site root will 404 — run `npm run build` before starting."
    );
  }
});
