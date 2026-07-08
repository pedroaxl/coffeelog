import { Router } from "express";
import type { Db } from "../db/connection.js";
import { asyncHandler } from "../lib/async-handler.js";
import { listCoffees } from "../repos/coffees.js";
import { getSettings } from "../repos/settings.js";

/** Full-database JSON export for backup (Settings "Export backup"). */
export function backupRouter(db: Db): Router {
  const router = Router();
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const consumptionLog = db
        .prepare("SELECT * FROM consumption_log ORDER BY id ASC")
        .all();
      const payload = {
        app: "CoffeeLog",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        settings: getSettings(db),
        coffees: listCoffees(db),
        consumptionLog,
      };
      const date = new Date().toISOString().slice(0, 10);
      res.set("Content-Disposition", `attachment; filename="coffeelog-backup-${date}.json"`);
      res.type("application/json");
      res.send(JSON.stringify(payload, null, 2));
    })
  );
  return router;
}
