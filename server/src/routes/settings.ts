import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/connection.js";
import { getSettings, updateSettings } from "../repos/settings.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest } from "../lib/http-error.js";

const stringList = z.array(z.string().trim().min(1)).max(50);

const patchSchema = z
  .object({
    instanceUrl: z.string().max(200),
    warnNotFrozenAfterDays: z.number().int().min(0).max(3650),
    warnFrozenOverDays: z.number().int().min(0).max(3650),
    labelWidthMm: z.number().positive().max(200),
    labelHeightMm: z.number().positive().max(200),
    labelDpi: z.number().int().min(72).max(1200),
    weightUnit: z.enum(["g"]),
    printerDevice: z.string().max(100),
    methodOptions: stringList,
    grinderOptions: stringList,
  })
  .partial()
  .strict();

export function settingsRouter(db: Db): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      res.json(getSettings(db));
    })
  );

  router.patch(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid settings", parsed.error.flatten());
      res.json(updateSettings(db, parsed.data));
    })
  );

  return router;
}
