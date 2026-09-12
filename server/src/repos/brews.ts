import type { Db } from "../db/connection.js";
import type { BrewType } from "./recipeVersions.js";

/** Where the grounds were stirred, if at all. */
export type Wdt = "none" | "inGrounds" | "inBed";
/** Whether the Paragon chiller was used, and when. */
export type Paragon = "no" | "underDripper" | "afterDrain";

export interface Brew {
  id: number;
  coffeeId: number;
  recipeVersionId: number | null;
  /** The vN label of the version above — null for brews migrated from v1. */
  recipeVersion: number | null;
  unitId: number | null;
  consumptionLogId: number | null;

  // layer 1 — what the Save button needs
  brewedAt: string;
  drainTimeSec: number | null;
  notes: string | null;
  rating: number | null;

  // layer 2 — executed parameters
  brewType: BrewType | null;
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  ratio: number | null; // derived
  waterTempC: number | null;
  grinder: string | null;
  grinderSetting: string | null;
  filter: string | null;
  bloomSec: number | null;

  // layer 3 — optional detail
  wdt: Wdt | null;
  paragon: Paragon | null;
  dripperLifted: boolean | null;
  tds: number | null;
  beverageG: number | null;
  /** tds × beverageG / doseG, only when all three are known. */
  extractionYield: number | null;
  acidBitter: number | null;
  astringency: number | null;
  body: number | null;
  sweetness: number | null;
  channeling: boolean | null;
  validForDialIn: boolean;
  discardReason: string | null;
  nextAction: string | null;
  experimentTag: string | null;

  createdAt: string;
}

/**
 * Everything a brew can carry. Absent keys mean "not given" — on create, the
 * executed parameters left absent are filled from the recipe version being
 * brewed; on update, absent keys are left alone. An explicit null always clears.
 */
export interface BrewInput {
  recipeVersionId?: number | null;
  unitId?: number | null;
  consumptionLogId?: number | null;
  brewedAt?: string;
  drainTimeSec?: number | null;
  notes?: string | null;
  rating?: number | null;
  brewType?: BrewType | null;
  method?: string | null;
  doseG?: number | null;
  yieldG?: number | null;
  waterTempC?: number | null;
  grinder?: string | null;
  grinderSetting?: string | null;
  filter?: string | null;
  bloomSec?: number | null;
  wdt?: Wdt | null;
  paragon?: Paragon | null;
  dripperLifted?: boolean | null;
  tds?: number | null;
  beverageG?: number | null;
  acidBitter?: number | null;
  astringency?: number | null;
  body?: number | null;
  sweetness?: number | null;
  channeling?: boolean | null;
  validForDialIn?: boolean;
  discardReason?: string | null;
  nextAction?: string | null;
  experimentTag?: string | null;
}

const COLUMNS: Record<keyof BrewInput, string> = {
  recipeVersionId: "recipe_version_id",
  unitId: "unit_id",
  consumptionLogId: "consumption_log_id",
  brewedAt: "brewed_at",
  drainTimeSec: "drain_time_sec",
  notes: "notes",
  rating: "rating",
  brewType: "brew_type",
  method: "method",
  doseG: "dose_g",
  yieldG: "yield_g",
  waterTempC: "water_temp_c",
  grinder: "grinder",
  grinderSetting: "grinder_setting",
  filter: "filter_name",
  bloomSec: "bloom_sec",
  wdt: "wdt",
  paragon: "paragon",
  dripperLifted: "dripper_lifted",
  tds: "tds",
  beverageG: "beverage_g",
  acidBitter: "acid_bitter",
  astringency: "astringency",
  body: "body",
  sweetness: "sweetness",
  channeling: "channeling",
  validForDialIn: "valid_for_dial_in",
  discardReason: "discard_reason",
  nextAction: "next_action",
  experimentTag: "experiment_tag",
};

/** The parameters a brew shares with the recipe that planned it. */
export const EXECUTED_PARAM_KEYS = [
  "brewType",
  "method",
  "doseG",
  "yieldG",
  "waterTempC",
  "grinder",
  "grinderSetting",
  "filter",
] as const;

interface BrewRow {
  id: number;
  coffee_id: number;
  recipe_version_id: number | null;
  recipe_version: number | null;
  unit_id: number | null;
  consumption_log_id: number | null;
  brewed_at: string;
  drain_time_sec: number | null;
  notes: string | null;
  rating: number | null;
  brew_type: BrewType | null;
  method: string | null;
  dose_g: number | null;
  yield_g: number | null;
  water_temp_c: number | null;
  grinder: string | null;
  grinder_setting: string | null;
  filter_name: string | null;
  bloom_sec: number | null;
  wdt: Wdt | null;
  paragon: Paragon | null;
  dripper_lifted: number | null;
  tds: number | null;
  beverage_g: number | null;
  acid_bitter: number | null;
  astringency: number | null;
  body: number | null;
  sweetness: number | null;
  channeling: number | null;
  valid_for_dial_in: number;
  discard_reason: string | null;
  next_action: string | null;
  experiment_tag: string | null;
  created_at: string;
}

const SELECT_BREW = /* sql */ `
  SELECT b.*, rv.version AS recipe_version
    FROM brews b
    LEFT JOIN recipe_versions rv ON rv.id = b.recipe_version_id
`;

const bool = (v: number | null): boolean | null => (v == null ? null : v === 1);

function mapBrew(row: BrewRow): Brew {
  const ratio =
    row.dose_g && row.dose_g > 0 && row.yield_g != null
      ? Math.round((row.yield_g / row.dose_g) * 10) / 10
      : null;
  // Extraction yield uses the weight in the cup, never the water poured: the bed
  // keeps some of it, so yieldG would inflate the number.
  const extractionYield =
    row.tds != null && row.beverage_g != null && row.dose_g && row.dose_g > 0
      ? Math.round(((row.tds * row.beverage_g) / row.dose_g) * 100) / 100
      : null;
  return {
    id: row.id,
    coffeeId: row.coffee_id,
    recipeVersionId: row.recipe_version_id,
    recipeVersion: row.recipe_version,
    unitId: row.unit_id,
    consumptionLogId: row.consumption_log_id,
    brewedAt: row.brewed_at,
    drainTimeSec: row.drain_time_sec,
    notes: row.notes,
    rating: row.rating,
    brewType: row.brew_type,
    method: row.method,
    doseG: row.dose_g,
    yieldG: row.yield_g,
    ratio,
    waterTempC: row.water_temp_c,
    grinder: row.grinder,
    grinderSetting: row.grinder_setting,
    filter: row.filter_name,
    bloomSec: row.bloom_sec,
    wdt: row.wdt,
    paragon: row.paragon,
    dripperLifted: bool(row.dripper_lifted),
    tds: row.tds,
    beverageG: row.beverage_g,
    extractionYield,
    acidBitter: row.acid_bitter,
    astringency: row.astringency,
    body: row.body,
    sweetness: row.sweetness,
    channeling: bool(row.channeling),
    validForDialIn: row.valid_for_dial_in === 1,
    discardReason: row.discard_reason,
    nextAction: row.next_action,
    experimentTag: row.experiment_tag,
    createdAt: row.created_at,
  };
}

/** SQLite has no booleans; the input layer speaks true/false. */
function toColumnValue(value: unknown): unknown {
  return typeof value === "boolean" ? (value ? 1 : 0) : value ?? null;
}

export function getBrew(db: Db, id: number): Brew | null {
  const row = db.prepare(`${SELECT_BREW} WHERE b.id = ?`).get(id) as BrewRow | undefined;
  return row ? mapBrew(row) : null;
}

export interface BrewFilter {
  coffeeId?: number;
  recipeVersionId?: number;
  experimentTag?: string;
  /** Drop brews excluded from dial-in (a channeled bed reads as noise). */
  validOnly?: boolean;
  limit?: number;
}

export function listBrews(db: Db, filter: BrewFilter = {}): Brew[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter.coffeeId != null) {
    where.push("b.coffee_id = @coffeeId");
    params.coffeeId = filter.coffeeId;
  }
  if (filter.recipeVersionId != null) {
    where.push("b.recipe_version_id = @recipeVersionId");
    params.recipeVersionId = filter.recipeVersionId;
  }
  if (filter.experimentTag) {
    where.push("b.experiment_tag = @experimentTag");
    params.experimentTag = filter.experimentTag;
  }
  if (filter.validOnly) where.push("b.valid_for_dial_in = 1");

  const sql = `${SELECT_BREW}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY b.brewed_at DESC, b.id DESC
    LIMIT @limit`;
  params.limit = filter.limit ?? 200;
  return (db.prepare(sql).all(params) as BrewRow[]).map(mapBrew);
}

export function insertBrew(db: Db, coffeeId: number, input: BrewInput): Brew {
  const keys = (Object.keys(input) as (keyof BrewInput)[]).filter(
    (k) => input[k] !== undefined && k in COLUMNS
  );
  const cols = ["coffee_id", ...keys.map((k) => COLUMNS[k])];
  const values = ["@coffeeId", ...keys.map((k) => `@${k}`)];
  const params: Record<string, unknown> = { coffeeId };
  for (const key of keys) params[key] = toColumnValue(input[key]);

  const info = db
    .prepare(`INSERT INTO brews (${cols.join(", ")}) VALUES (${values.join(", ")})`)
    .run(params);
  return getBrew(db, Number(info.lastInsertRowid))!;
}

export function updateBrew(db: Db, id: number, patch: BrewInput): Brew | null {
  const keys = (Object.keys(patch) as (keyof BrewInput)[]).filter(
    (k) => patch[k] !== undefined && k in COLUMNS
  );
  if (keys.length > 0) {
    const params: Record<string, unknown> = { id };
    for (const key of keys) params[key] = toColumnValue(patch[key]);
    db.prepare(
      `UPDATE brews SET ${keys.map((k) => `${COLUMNS[k]} = @${k}`).join(", ")} WHERE id = @id`
    ).run(params);
  }
  return getBrew(db, id);
}

export function deleteBrew(db: Db, id: number): boolean {
  return db.prepare("DELETE FROM brews WHERE id = ?").run(id).changes > 0;
}

/** Remove the brews recorded as part of a consume, for when that consume is undone. */
export function deleteBrewsForConsumption(db: Db, logId: number): number {
  return db.prepare("DELETE FROM brews WHERE consumption_log_id = ?").run(logId).changes;
}
