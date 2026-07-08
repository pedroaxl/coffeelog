import { Router } from "express";
import type { Db } from "../db/connection.js";
import { asyncHandler } from "../lib/async-handler.js";
import { listCoffees } from "../repos/coffees.js";
import { getSettings } from "../repos/settings.js";
import { computeAlerts } from "../services/alerts.js";

export function alertsRouter(db: Db): Router {
  const router = Router();
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const alerts = computeAlerts(listCoffees(db), getSettings(db));
      res.json(alerts);
    })
  );
  return router;
}
