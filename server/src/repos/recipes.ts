import type { Db } from "../db/connection.js";

export interface Recipe {
  id: number;
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  ratio: number | null; // derived from yield/dose
  waterTempC: number | null;
  grinder: string | null;
  grinderSetting: string | null;
  protocol: string | null;
}

interface RecipeRow {
  id: number;
  method: string | null;
  dose_g: number | null;
  yield_g: number | null;
  water_temp_c: number | null;
  grinder: string | null;
  grinder_setting: string | null;
  protocol: string | null;
}

function mapRecipe(row: RecipeRow): Recipe {
  const ratio =
    row.dose_g && row.dose_g > 0 && row.yield_g != null
      ? Math.round((row.yield_g / row.dose_g) * 10) / 10
      : null;
  return {
    id: row.id,
    method: row.method,
    doseG: row.dose_g,
    yieldG: row.yield_g,
    ratio,
    waterTempC: row.water_temp_c,
    grinder: row.grinder,
    grinderSetting: row.grinder_setting,
    protocol: row.protocol,
  };
}

/** v1 keeps at most one recipe per coffee — return the most recent if several exist. */
export function getRecipeForCoffee(db: Db, coffeeId: number): Recipe | null {
  const row = db
    .prepare("SELECT * FROM recipes WHERE coffee_id = ? ORDER BY id DESC LIMIT 1")
    .get(coffeeId) as RecipeRow | undefined;
  return row ? mapRecipe(row) : null;
}

export interface RecipeInput {
  method?: string | null;
  doseG?: number | null;
  yieldG?: number | null;
  waterTempC?: number | null;
  grinder?: string | null;
  grinderSetting?: string | null;
  protocol?: string | null;
}

/** Insert or update the single v1 recipe for a coffee. */
export function upsertRecipe(db: Db, coffeeId: number, input: RecipeInput): Recipe {
  const existing = db
    .prepare("SELECT id FROM recipes WHERE coffee_id = ? ORDER BY id DESC LIMIT 1")
    .get(coffeeId) as { id: number } | undefined;

  const params = {
    coffeeId,
    method: input.method ?? null,
    doseG: input.doseG ?? null,
    yieldG: input.yieldG ?? null,
    waterTempC: input.waterTempC ?? null,
    grinder: input.grinder ?? null,
    grinderSetting: input.grinderSetting ?? null,
    protocol: input.protocol ?? null,
  };

  if (existing) {
    db.prepare(
      `UPDATE recipes SET method=@method, dose_g=@doseG, yield_g=@yieldG,
        water_temp_c=@waterTempC, grinder=@grinder, grinder_setting=@grinderSetting,
        protocol=@protocol WHERE id=@id`
    ).run({ ...params, id: existing.id });
  } else {
    db.prepare(
      `INSERT INTO recipes
        (coffee_id, method, dose_g, yield_g, water_temp_c, grinder, grinder_setting, protocol)
       VALUES (@coffeeId, @method, @doseG, @yieldG, @waterTempC, @grinder, @grinderSetting, @protocol)`
    ).run(params);
  }
  return getRecipeForCoffee(db, coffeeId)!;
}
