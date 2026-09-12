import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/connection.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { coffeeExists, getCoffee } from "../repos/coffees.js";
import { getBrew, listBrews, updateBrew, deleteBrew } from "../repos/brews.js";
import { logBrew, promoteBrew } from "../services/brews.js";

const nullableString = z.string().trim().max(200).nullish();

/**
 * A brew is deliberately forgiving: everything but the coffee is optional, and an
 * incomplete brew is a normal state — the usual flow saves a drain time at the
 * kettle and comes back for the tasting notes after drinking it.
 */
export const brewInput = z.object({
  // Layer 1
  recipeVersionId: z.number().int().positive().nullish(),
  unitId: z.number().int().positive().nullish(),
  brewedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}([ T][\d:.]+Z?)?$/, "expected a date or date-time")
    .optional(),
  drainTimeSec: z.number().int().min(0).max(36000).nullish(),
  notes: z.string().max(4000).nullish(),
  rating: z.number().int().min(1).max(5).nullish(),

  // Layer 2 — executed parameters; absent ones are filled from the recipe version
  brewType: z.enum(["filter", "espresso"]).nullish(),
  method: nullableString,
  doseG: z.number().min(0).max(1000).nullish(),
  yieldG: z.number().min(0).max(5000).nullish(),
  waterTempC: z.number().min(0).max(100).nullish(),
  grinder: nullableString,
  grinderSetting: nullableString,
  filter: nullableString,
  bloomSec: z.number().int().min(0).max(3600).nullish(),

  // Layer 3 — optional detail
  wdt: z.enum(["none", "inGrounds", "inBed"]).nullish(),
  paragon: z.enum(["no", "underDripper", "afterDrain"]).nullish(),
  dripperLifted: z.boolean().nullish(),
  tds: z.number().min(0).max(10).nullish(),
  beverageG: z.number().min(0).max(5000).nullish(),
  acidBitter: z.number().int().min(-2).max(2).nullish(),
  astringency: z.number().int().min(0).max(3).nullish(),
  body: z.number().int().min(-1).max(1).nullish(),
  sweetness: z.number().int().min(0).max(3).nullish(),
  channeling: z.boolean().nullish(),
  validForDialIn: z.boolean().optional(),
  discardReason: z.string().max(300).nullish(),
  nextAction: z.string().max(300).nullish(),
  experimentTag: z.string().trim().max(100).nullish(),
});

const listQuery = z.object({
  coffeeId: z.coerce.number().int().positive().optional(),
  experimentTag: z.string().trim().max(100).optional(),
  validOnly: z
    .enum(["true", "false", "1", "0"])
    .transform((v) => v === "true" || v === "1")
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const promoteInput = z.object({
  changeNote: z.string().trim().max(300).nullish(),
  kind: z.enum(["baseline", "tweak"]).nullish(),
});

/** Brew routes scoped to a coffee. Mounted alongside the coffees router. */
export function coffeeBrewsRouter(db: Db): Router {
  const router = Router();

  router.get(
    "/:id/brews",
    asyncHandler(async (req, res) => {
      const coffeeId = Number(req.params.id);
      if (!coffeeExists(db, coffeeId)) throw notFound("Coffee");
      const parsed = listQuery.safeParse(req.query);
      if (!parsed.success) throw badRequest("Invalid filter", parsed.error.flatten());
      res.json(listBrews(db, { ...parsed.data, coffeeId }));
    })
  );

  router.post(
    "/:id/brews",
    asyncHandler(async (req, res) => {
      const coffeeId = Number(req.params.id);
      if (!coffeeExists(db, coffeeId)) throw notFound("Coffee");
      const parsed = brewInput.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid brew", parsed.error.flatten());
      const brew = logBrew(db, coffeeId, parsed.data);
      res.status(201).json({ brew, coffee: getCoffee(db, coffeeId) });
    })
  );

  return router;
}

/** Brew routes addressed by brew id, plus the cross-coffee listing. */
export function brewsRouter(db: Db): Router {
  const router = Router();

  // Cross-coffee listing — how an experiment tag is compared across coffees.
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = listQuery.safeParse(req.query);
      if (!parsed.success) throw badRequest("Invalid filter", parsed.error.flatten());
      res.json(listBrews(db, parsed.data));
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const brew = getBrew(db, Number(req.params.id));
      if (!brew) throw notFound("Brew");
      res.json(brew);
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!getBrew(db, id)) throw notFound("Brew");
      const parsed = brewInput.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid brew", parsed.error.flatten());
      res.json(updateBrew(db, id, parsed.data));
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!deleteBrew(db, Number(req.params.id))) throw notFound("Brew");
      res.status(204).end();
    })
  );

  // Turn what happened into the plan: a new recipe version from this brew.
  router.post(
    "/:id/promote",
    asyncHandler(async (req, res) => {
      const brew = getBrew(db, Number(req.params.id));
      if (!brew) throw notFound("Brew");
      const parsed = promoteInput.safeParse(req.body ?? {});
      if (!parsed.success) throw badRequest("Invalid promotion", parsed.error.flatten());
      const version = promoteBrew(db, brew.id, parsed.data);
      res.status(201).json({ recipeVersion: version, coffee: getCoffee(db, brew.coffeeId) });
    })
  );

  return router;
}
