import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import type { Db } from "./db/connection.js";
import { settingsRouter } from "./routes/settings.js";
import { coffeesRouter } from "./routes/coffees.js";
import { unitsRouter, consumeRouter } from "./routes/units.js";
import { alertsRouter } from "./routes/alerts.js";
import { labelsRouter, scanRouter } from "./routes/labels.js";
import { HttpError } from "./lib/http-error.js";

export interface AppOptions {
  /** Absolute path to the built web app (web/dist). If set, it is served + SPA fallback. */
  webDist?: string;
  /** Absolute path to the uploads directory (served at /uploads). */
  uploadsDir?: string;
}

export function buildApp(db: Db, opts: AppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Photo uploads land wherever the data dir is; tests fall back to a temp dir.
  const uploadsDir = opts.uploadsDir ?? os.tmpdir();

  const api = express.Router();
  api.get("/health", (_req, res) => res.json({ ok: true, version: "1.0.0" }));
  api.use("/settings", settingsRouter(db));
  api.use("/coffees", coffeesRouter(db, uploadsDir));
  api.use("/units", unitsRouter(db));
  api.use("/consume", consumeRouter(db));
  api.use("/alerts", alertsRouter(db));
  api.use("/labels", labelsRouter(db));
  api.use("/scan", scanRouter(db));
  app.use("/api", api);

  if (opts.uploadsDir) {
    app.use("/uploads", express.static(opts.uploadsDir));
  }

  // Serve the built SPA (production). API + uploads are matched first above.
  if (opts.webDist && fs.existsSync(opts.webDist)) {
    app.use(express.static(opts.webDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
      res.sendFile(path.join(opts.webDist!, "index.html"));
    });
  }

  // Central error handler: HttpError -> its status, otherwise 500.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
