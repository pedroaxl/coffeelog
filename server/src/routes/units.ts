import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/connection.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { getCoffee } from "../repos/coffees.js";
import { coffeeIdForUnit } from "../repos/units.js";
import {
  setUnitState,
  portionBag,
  consumeUnit,
  undoConsume,
} from "../services/stock.js";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const stateSchema = z
  .object({
    sealState: z.enum(["sealed", "open"]).optional(),
    tempState: z.enum(["frozen", "defrosted"]).optional(),
    frozenDate: dateString.nullable().optional(),
    openedDate: dateString.nullable().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.sealState !== undefined ||
      v.tempState !== undefined ||
      v.frozenDate !== undefined ||
      v.openedDate !== undefined,
    "Nothing to change"
  );

const portionSchema = z.object({
  tubes: z.array(z.object({ weightG: z.number().positive().max(100000) })).min(1).max(50),
  tubeState: z.enum(["frozen", "defrosted"]),
});

const consumeSchema = z.object({
  grams: z.number().positive().max(100000).optional(),
  note: z.string().max(2000).nullish(),
});

export function unitsRouter(db: Db): Router {
  const router = Router();

  // Unit detail: the parent coffee plus the specific unit (scanner + unit page).
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const coffeeId = coffeeIdForUnit(db, Number(req.params.id));
      if (coffeeId == null) throw notFound("Unit");
      const coffee = getCoffee(db, coffeeId)!;
      const unit = coffee.units.find((u) => u.id === Number(req.params.id))!;
      res.json({ coffee, unit });
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const parsed = stateSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid state change", parsed.error.flatten());
      const coffeeId = setUnitState(db, Number(req.params.id), parsed.data);
      res.json(getCoffee(db, coffeeId));
    })
  );

  router.post(
    "/:id/portion",
    asyncHandler(async (req, res) => {
      const parsed = portionSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid portioning", parsed.error.flatten());
      const coffeeId = portionBag(db, Number(req.params.id), parsed.data);
      res.json(getCoffee(db, coffeeId));
    })
  );

  router.post(
    "/:id/consume",
    asyncHandler(async (req, res) => {
      const parsed = consumeSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid consume", parsed.error.flatten());
      const { logId, coffeeId } = consumeUnit(db, Number(req.params.id), parsed.data);
      res.json({ coffee: getCoffee(db, coffeeId), logId });
    })
  );

  return router;
}

/** Undo endpoint, mounted at /consume. */
export function consumeRouter(db: Db): Router {
  const router = Router();
  router.post(
    "/:logId/undo",
    asyncHandler(async (req, res) => {
      const coffeeId = undoConsume(db, Number(req.params.logId));
      res.json(getCoffee(db, coffeeId));
    })
  );
  return router;
}
