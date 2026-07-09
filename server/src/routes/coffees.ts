import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/connection.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import {
  listCoffees,
  getCoffee,
  insertCoffee,
  updateCoffee,
  deleteCoffee,
  coffeeExists,
  replaceNotes,
  type CoffeeFields,
} from "../repos/coffees.js";
import { upsertRecipe } from "../repos/recipes.js";
import { insertUnit } from "../repos/units.js";
import {
  addPhoto,
  removePhotoRow,
  setPrimaryPhoto,
  removeAllPhotoRows,
} from "../repos/coffeePhotos.js";
import { photoUpload, savePhoto, removePhoto } from "../services/photos.js";

const today = () => new Date().toISOString().slice(0, 10);

const nullableString = z.string().trim().max(200).nullish();
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .nullish();

const coffeeFields = z.object({
  name: z.string().trim().min(1).max(200),
  roaster: nullableString,
  variety: nullableString,
  process: nullableString,
  beanRegion: nullableString,
  beanCountry: nullableString,
  roasteryName: nullableString,
  roasteryCountry: nullableString,
  altitudeM: z.number().int().min(0).max(9000).nullish(),
  roastLevel: nullableString,
  roastDate: dateString,
  purchaseDate: dateString,
  score: z.number().int().min(1).max(5).nullish(),
});

const recipeInput = z.object({
  brewType: z.enum(["filter", "espresso"]).nullish(),
  method: nullableString,
  doseG: z.number().min(0).max(1000).nullish(),
  yieldG: z.number().min(0).max(5000).nullish(),
  waterTempC: z.number().min(0).max(100).nullish(),
  grinder: nullableString,
  grinderSetting: nullableString,
  protocol: z.string().max(5000).nullish(),
});

// New-coffee wizard step 3: one bag with an initial state.
const initialUnit = z.object({
  weightG: z.number().positive().max(100000),
  initialState: z.enum(["sealed", "open", "frozen"]),
});

const createSchema = coffeeFields.extend({
  tastingNotes: z.array(z.string().trim().min(1)).max(30).optional(),
  recipe: recipeInput.optional(),
  initialUnit: initialUnit.optional(),
});

const updateSchema = coffeeFields
  .partial()
  .extend({
    tastingNotes: z.array(z.string().trim().min(1)).max(30).optional(),
    recipe: recipeInput.optional(),
  })
  .strict();

function toFields(data: z.infer<typeof coffeeFields>): CoffeeFields {
  return {
    name: data.name,
    roaster: data.roaster ?? null,
    variety: data.variety ?? null,
    process: data.process ?? null,
    beanRegion: data.beanRegion ?? null,
    beanCountry: data.beanCountry ?? null,
    roasteryName: data.roasteryName ?? null,
    roasteryCountry: data.roasteryCountry ?? null,
    altitudeM: data.altitudeM ?? null,
    roastLevel: data.roastLevel ?? null,
    roastDate: data.roastDate ?? null,
    purchaseDate: data.purchaseDate ?? null,
    photoPath: null,
    score: data.score ?? null,
  };
}

/** Map the wizard's Sealed/Open/Frozen choice to the bag's two state axes. */
function bagStateFromInitial(state: "sealed" | "open" | "frozen") {
  switch (state) {
    case "open":
      return { sealState: "open" as const, tempState: "defrosted" as const, openedDate: today() };
    case "frozen":
      return { sealState: "sealed" as const, tempState: "frozen" as const, frozenDate: today() };
    case "sealed":
    default:
      return { sealState: "sealed" as const, tempState: "defrosted" as const };
  }
}

export function coffeesRouter(db: Db, uploadsDir: string): Router {
  const router = Router();
  const upload = photoUpload();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      res.json(listCoffees(db));
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const coffee = getCoffee(db, Number(req.params.id));
      if (!coffee) throw notFound("Coffee");
      res.json(coffee);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid coffee", parsed.error.flatten());
      const data = parsed.data;

      const id = db.transaction(() => {
        const newId = insertCoffee(db, toFields(data));
        if (data.tastingNotes) replaceNotes(db, newId, data.tastingNotes);
        if (data.recipe) upsertRecipe(db, newId, data.recipe);
        if (data.initialUnit) {
          const bag = bagStateFromInitial(data.initialUnit.initialState);
          insertUnit(db, {
            coffeeId: newId,
            kind: "bag",
            weightG: data.initialUnit.weightG,
            sealState: bag.sealState,
            tempState: bag.tempState,
            frozenDate: "frozenDate" in bag ? bag.frozenDate : null,
            openedDate: "openedDate" in bag ? bag.openedDate : null,
          });
        }
        return newId;
      })();

      res.status(201).json(getCoffee(db, id));
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!coffeeExists(db, id)) throw notFound("Coffee");
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid coffee", parsed.error.flatten());
      const { tastingNotes, recipe, ...fields } = parsed.data;

      db.transaction(() => {
        updateCoffee(db, id, fields as Partial<CoffeeFields>);
        if (tastingNotes) replaceNotes(db, id, tastingNotes);
        if (recipe) upsertRecipe(db, id, recipe);
      })();

      res.json(getCoffee(db, id));
    })
  );

  // Score is editable anytime (nullable) — dedicated endpoint for the detail screen.
  router.patch(
    "/:id/score",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!coffeeExists(db, id)) throw notFound("Coffee");
      const schema = z.object({ score: z.number().int().min(1).max(5).nullable() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid score", parsed.error.flatten());
      updateCoffee(db, id, { score: parsed.data.score });
      res.json(getCoffee(db, id));
    })
  );

  router.put(
    "/:id/recipe",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!coffeeExists(db, id)) throw notFound("Coffee");
      const parsed = recipeInput.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid recipe", parsed.error.flatten());
      upsertRecipe(db, id, parsed.data);
      res.json(getCoffee(db, id));
    })
  );

  // Upload one or more photos (appended). The first photo is the cover.
  router.post(
    "/:id/photos",
    upload.array("photos", 8),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!coffeeExists(db, id)) throw notFound("Coffee");
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) throw badRequest("No photo uploaded");
      let saved = 0;
      for (const file of files) {
        try {
          const url = await savePhoto(uploadsDir, file);
          addPhoto(db, id, url);
          saved++;
        } catch {
          /* skip unreadable files */
        }
      }
      if (saved === 0) throw badRequest("Couldn't read that image — try a JPEG, PNG or HEIC photo");
      res.json(getCoffee(db, id));
    })
  );

  /**
   * Back-compat: the pre-multi-photo client posted a single file as "photo" to
   * this path. A browser running a cached bundle would otherwise 404 here, so
   * keep accepting it and append like /photos does.
   */
  router.post(
    "/:id/photo",
    upload.single("photo"),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!coffeeExists(db, id)) throw notFound("Coffee");
      if (!req.file) throw badRequest("No photo uploaded");
      try {
        addPhoto(db, id, await savePhoto(uploadsDir, req.file));
      } catch {
        throw badRequest("Couldn't read that image — try a JPEG, PNG or HEIC photo");
      }
      res.json(getCoffee(db, id));
    })
  );

  const photoPathSchema = z.object({ path: z.string().min(1).max(300) });

  router.delete(
    "/:id/photos",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!coffeeExists(db, id)) throw notFound("Coffee");
      const parsed = photoPathSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Missing photo path");
      if (removePhotoRow(db, id, parsed.data.path)) {
        removePhoto(uploadsDir, parsed.data.path);
      }
      res.json(getCoffee(db, id));
    })
  );

  router.patch(
    "/:id/photos/primary",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!coffeeExists(db, id)) throw notFound("Coffee");
      const parsed = photoPathSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Missing photo path");
      setPrimaryPhoto(db, id, parsed.data.path);
      res.json(getCoffee(db, id));
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const coffee = getCoffee(db, id);
      if (!coffee) throw notFound("Coffee");
      for (const p of removeAllPhotoRows(db, id)) removePhoto(uploadsDir, p);
      deleteCoffee(db, id);
      res.status(204).end();
    })
  );

  return router;
}
