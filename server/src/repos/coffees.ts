import type { Db } from "../db/connection.js";
import { getNotes, replaceNotes } from "./notes.js";
import { getRecipeForCoffee, type Recipe } from "./recipes.js";
import { listUnitsByCoffee, type StorageUnit } from "./units.js";

export interface CoffeeFields {
  name: string;
  roaster: string | null;
  variety: string | null;
  process: string | null;
  beanRegion: string | null;
  beanCountry: string | null;
  roasteryName: string | null;
  roasteryCountry: string | null;
  altitudeM: number | null;
  roastLevel: string | null;
  roastDate: string | null;
  purchaseDate: string | null;
  photoPath: string | null;
  score: number | null;
}

export interface Coffee extends CoffeeFields {
  id: number;
  createdAt: string;
  lastUsedAt: string | null; // most recent (non-undone) consumption
  tastingNotes: string[];
  recipe: Recipe | null;
  units: StorageUnit[];
  remainingG: number;
  activeUnitCount: number;
  status: "available" | "archived";
}

interface CoffeeRow {
  id: number;
  name: string;
  roaster: string | null;
  variety: string | null;
  process: string | null;
  bean_region: string | null;
  bean_country: string | null;
  roastery_name: string | null;
  roastery_country: string | null;
  altitude_m: number | null;
  roast_level: string | null;
  roast_date: string | null;
  purchase_date: string | null;
  photo_path: string | null;
  score: number | null;
  created_at: string;
}

const COLUMNS: Record<keyof CoffeeFields, string> = {
  name: "name",
  roaster: "roaster",
  variety: "variety",
  process: "process",
  beanRegion: "bean_region",
  beanCountry: "bean_country",
  roasteryName: "roastery_name",
  roasteryCountry: "roastery_country",
  altitudeM: "altitude_m",
  roastLevel: "roast_level",
  roastDate: "roast_date",
  purchaseDate: "purchase_date",
  photoPath: "photo_path",
  score: "score",
};

function mapCoffee(db: Db, row: CoffeeRow): Coffee {
  const units = listUnitsByCoffee(db, row.id);
  const active = units.filter((u) => u.active);
  const remainingG = active.reduce((sum, u) => sum + u.weightG, 0);
  const lastUsed = db
    .prepare(
      "SELECT MAX(created_at) AS t FROM consumption_log WHERE coffee_id = ? AND undone = 0"
    )
    .get(row.id) as { t: string | null };
  return {
    id: row.id,
    name: row.name,
    roaster: row.roaster,
    variety: row.variety,
    process: row.process,
    beanRegion: row.bean_region,
    beanCountry: row.bean_country,
    roasteryName: row.roastery_name,
    roasteryCountry: row.roastery_country,
    altitudeM: row.altitude_m,
    roastLevel: row.roast_level,
    roastDate: row.roast_date,
    purchaseDate: row.purchase_date,
    photoPath: row.photo_path,
    score: row.score,
    createdAt: row.created_at,
    lastUsedAt: lastUsed.t,
    tastingNotes: getNotes(db, row.id),
    recipe: getRecipeForCoffee(db, row.id),
    units,
    remainingG: Math.round(remainingG * 10) / 10,
    activeUnitCount: active.length,
    status: active.length > 0 ? "available" : "archived",
  };
}

export function getCoffee(db: Db, id: number): Coffee | undefined {
  const row = db.prepare("SELECT * FROM coffees WHERE id = ?").get(id) as
    | CoffeeRow
    | undefined;
  return row ? mapCoffee(db, row) : undefined;
}

export function listCoffees(db: Db): Coffee[] {
  const rows = db
    .prepare("SELECT * FROM coffees ORDER BY created_at DESC, id DESC")
    .all() as CoffeeRow[];
  return rows.map((r) => mapCoffee(db, r));
}

export function insertCoffee(db: Db, fields: CoffeeFields): number {
  const info = db
    .prepare(
      `INSERT INTO coffees
        (name, roaster, variety, process, bean_region, bean_country, roastery_name,
         roastery_country, altitude_m, roast_level, roast_date, purchase_date, photo_path, score)
       VALUES
        (@name, @roaster, @variety, @process, @beanRegion, @beanCountry, @roasteryName,
         @roasteryCountry, @altitudeM, @roastLevel, @roastDate, @purchaseDate, @photoPath, @score)`
    )
    .run(fields);
  return Number(info.lastInsertRowid);
}

/** Patch a subset of a coffee's own columns (not notes/recipe/units). */
export function updateCoffee(db: Db, id: number, patch: Partial<CoffeeFields>): void {
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(patch) as [keyof CoffeeFields, unknown][]) {
    if (value === undefined) continue;
    sets.push(`${COLUMNS[key]} = @${key}`);
    params[key] = value;
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE coffees SET ${sets.join(", ")} WHERE id = @id`).run(params);
  }
}

export function deleteCoffee(db: Db, id: number): boolean {
  const info = db.prepare("DELETE FROM coffees WHERE id = ?").run(id);
  return info.changes > 0;
}

export function coffeeExists(db: Db, id: number): boolean {
  return !!db.prepare("SELECT 1 FROM coffees WHERE id = ?").get(id);
}

export { replaceNotes };
