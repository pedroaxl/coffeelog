import type { Db } from "../db/connection.js";

/** Whether the recipe is a filter (pour-over/immersion) or an espresso recipe. */
export type BrewType = "filter" | "espresso";

/**
 * `tweak` — one variable moved from the previous version, so the two compare.
 * `baseline` — a reset: several things changed at once, or there was nothing to
 * change from. Don't read a baseline as a dial-in step.
 */
export type RecipeKind = "baseline" | "tweak";

export interface RecipeVersion {
  id: number;
  coffeeId: number;
  version: number; // 1-based per coffee, shown as v1, v2…
  changeNote: string | null; // why this re-dial happened
  kind: RecipeKind;
  brewType: BrewType | null;
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  ratio: number | null; // derived from yield/dose, never stored
  waterTempC: number | null;
  grinder: string | null;
  grinderSetting: string | null;
  filter: string | null;
  drainTargetMinSec: number | null;
  drainTargetMaxSec: number | null;
  protocol: string | null;
  createdAt: string;
  supersededAt: string | null;
  /** Brews recorded against this version. Zero means it is still a draft. */
  brewCount: number;
  isCurrent: boolean;
}

/** The active version of a coffee's recipe — what the app calls "the recipe". */
export type Recipe = RecipeVersion;

interface VersionRow {
  id: number;
  coffee_id: number;
  version: number;
  change_note: string | null;
  kind: RecipeKind;
  brew_type: BrewType | null;
  method: string | null;
  dose_g: number | null;
  yield_g: number | null;
  water_temp_c: number | null;
  grinder: string | null;
  grinder_setting: string | null;
  filter_name: string | null;
  drain_target_min_sec: number | null;
  drain_target_max_sec: number | null;
  protocol: string | null;
  created_at: string;
  superseded_at: string | null;
  brew_count: number;
  is_current: number;
}

/**
 * Every read goes through this projection so `brewCount` (which decides whether
 * a version is still editable) and `isCurrent` are never missing.
 */
const SELECT_VERSION = /* sql */ `
  SELECT rv.*,
         (SELECT COUNT(*) FROM brews b WHERE b.recipe_version_id = rv.id) AS brew_count,
         COALESCE(c.current_recipe_version_id = rv.id, 0) AS is_current
    FROM recipe_versions rv
    JOIN coffees c ON c.id = rv.coffee_id
`;

function mapVersion(row: VersionRow): RecipeVersion {
  const ratio =
    row.dose_g && row.dose_g > 0 && row.yield_g != null
      ? Math.round((row.yield_g / row.dose_g) * 10) / 10
      : null;
  return {
    id: row.id,
    coffeeId: row.coffee_id,
    version: row.version,
    changeNote: row.change_note,
    kind: row.kind,
    brewType: row.brew_type,
    method: row.method,
    doseG: row.dose_g,
    yieldG: row.yield_g,
    ratio,
    waterTempC: row.water_temp_c,
    grinder: row.grinder,
    grinderSetting: row.grinder_setting,
    filter: row.filter_name,
    drainTargetMinSec: row.drain_target_min_sec,
    drainTargetMaxSec: row.drain_target_max_sec,
    protocol: row.protocol,
    createdAt: row.created_at,
    supersededAt: row.superseded_at,
    brewCount: row.brew_count,
    isCurrent: row.is_current === 1,
  };
}

export function getVersionById(db: Db, id: number): RecipeVersion | null {
  const row = db.prepare(`${SELECT_VERSION} WHERE rv.id = ?`).get(id) as VersionRow | undefined;
  return row ? mapVersion(row) : null;
}

/** The version the coffee points at, falling back to its newest one. */
export function getRecipeForCoffee(db: Db, coffeeId: number): Recipe | null {
  const row = db
    .prepare(
      `${SELECT_VERSION}
        WHERE rv.coffee_id = ?
        ORDER BY is_current DESC, rv.version DESC, rv.id DESC
        LIMIT 1`
    )
    .get(coffeeId) as VersionRow | undefined;
  return row ? mapVersion(row) : null;
}

/** Full history for a coffee, newest first. */
export function listVersions(db: Db, coffeeId: number): RecipeVersion[] {
  const rows = db
    .prepare(`${SELECT_VERSION} WHERE rv.coffee_id = ? ORDER BY rv.version DESC, rv.id DESC`)
    .all(coffeeId) as VersionRow[];
  return rows.map(mapVersion);
}

export function getVersionByNumber(
  db: Db,
  coffeeId: number,
  version: number
): RecipeVersion | null {
  const row = db
    .prepare(`${SELECT_VERSION} WHERE rv.coffee_id = ? AND rv.version = ?`)
    .get(coffeeId, version) as VersionRow | undefined;
  return row ? mapVersion(row) : null;
}

/** The parameters a recipe version carries. Absent keys mean "not set". */
export interface RecipeInput {
  brewType?: BrewType | null;
  method?: string | null;
  doseG?: number | null;
  yieldG?: number | null;
  waterTempC?: number | null;
  grinder?: string | null;
  grinderSetting?: string | null;
  filter?: string | null;
  drainTargetMinSec?: number | null;
  drainTargetMaxSec?: number | null;
  protocol?: string | null;
  /** Why this re-dial happened. Never carried over from the previous version. */
  changeNote?: string | null;
  kind?: RecipeKind | null;
}

const PARAM_KEYS = [
  "brewType",
  "method",
  "doseG",
  "yieldG",
  "waterTempC",
  "grinder",
  "grinderSetting",
  "filter",
  "drainTargetMinSec",
  "drainTargetMaxSec",
  "protocol",
] as const;

type ParamKey = (typeof PARAM_KEYS)[number];

function columns(input: RecipeInput) {
  return {
    brewType: input.brewType ?? null,
    method: input.method ?? null,
    doseG: input.doseG ?? null,
    yieldG: input.yieldG ?? null,
    waterTempC: input.waterTempC ?? null,
    grinder: input.grinder ?? null,
    grinderSetting: input.grinderSetting ?? null,
    filter: input.filter ?? null,
    drainTargetMinSec: input.drainTargetMinSec ?? null,
    drainTargetMaxSec: input.drainTargetMaxSec ?? null,
    protocol: input.protocol ?? null,
  };
}

/** The parameters of an existing version, as an input for the next one. */
export function paramsOf(version: RecipeVersion): RecipeInput {
  const out: RecipeInput = {};
  for (const key of PARAM_KEYS) {
    (out as Record<ParamKey, unknown>)[key] = version[key];
  }
  return out;
}

/**
 * Append a new version and make it current. A full replace: parameters absent
 * from the input are stored as null, which is what keeps PUT behaving the way v1
 * callers expect.
 */
export function createVersion(db: Db, coffeeId: number, input: RecipeInput): RecipeVersion {
  const current = getRecipeForCoffee(db, coffeeId);
  // The first version of a recipe has nothing to be a tweak of.
  const kind: RecipeKind = input.kind ?? (current ? "tweak" : "baseline");
  const next = db
    .prepare("SELECT COALESCE(MAX(version), 0) + 1 AS n FROM recipe_versions WHERE coffee_id = ?")
    .get(coffeeId) as { n: number };

  const id = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO recipe_versions
          (coffee_id, version, change_note, kind, brew_type, method, dose_g, yield_g,
           water_temp_c, grinder, grinder_setting, filter_name, drain_target_min_sec,
           drain_target_max_sec, protocol)
         VALUES (@coffeeId, @version, @changeNote, @kind, @brewType, @method, @doseG, @yieldG,
                 @waterTempC, @grinder, @grinderSetting, @filter, @drainTargetMinSec,
                 @drainTargetMaxSec, @protocol)`
      )
      .run({
        ...columns(input),
        coffeeId,
        version: next.n,
        changeNote: input.changeNote ?? null,
        kind,
      });
    const newId = Number(info.lastInsertRowid);
    if (current) {
      db.prepare(
        "UPDATE recipe_versions SET superseded_at = datetime('now') WHERE id = ?"
      ).run(current.id);
    }
    db.prepare("UPDATE coffees SET current_recipe_version_id = ? WHERE id = ?").run(
      newId,
      coffeeId
    );
    return newId;
  })();

  return getVersionById(db, id)!;
}

/** Drop keys the caller didn't send, so a patch only moves what it names. */
function provided(patch: RecipeInput): RecipeInput {
  const out: RecipeInput = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/**
 * Merge a patch into the current version.
 *
 * A version nobody has brewed yet is a draft and is edited in place; once a brew
 * points at it, it is history, and the write transparently becomes a new version
 * instead. That rule is deterministic — no guessing whether a change was
 * "significant" — and it is why fixing a typo doesn't inflate the history while
 * re-dialing always leaves a trail.
 */
export function patchRecipe(db: Db, coffeeId: number, patch: RecipeInput): RecipeVersion {
  const current = getRecipeForCoffee(db, coffeeId);
  if (!current) return createVersion(db, coffeeId, patch);

  const given = provided(patch);
  if (current.brewCount > 0) {
    // Frozen: fork. Parameters carry over, but the note and kind describe the
    // new version and are never inherited.
    return createVersion(db, coffeeId, {
      ...paramsOf(current),
      ...given,
      changeNote: given.changeNote ?? null,
      kind: given.kind ?? "tweak",
    });
  }

  const merged = { ...paramsOf(current), ...given };
  db.prepare(
    `UPDATE recipe_versions SET
       brew_type=@brewType, method=@method, dose_g=@doseG, yield_g=@yieldG,
       water_temp_c=@waterTempC, grinder=@grinder, grinder_setting=@grinderSetting,
       filter_name=@filter, drain_target_min_sec=@drainTargetMinSec,
       drain_target_max_sec=@drainTargetMaxSec, protocol=@protocol,
       change_note=@changeNote, kind=@kind
     WHERE id=@id`
  ).run({
    ...columns(merged),
    changeNote: "changeNote" in given ? given.changeNote ?? null : current.changeNote,
    kind: given.kind ?? current.kind,
    id: current.id,
  });
  return getVersionById(db, current.id)!;
}
