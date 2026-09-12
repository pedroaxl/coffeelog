import type { Db } from "../db/connection.js";
import { badRequest, notFound } from "../lib/http-error.js";
import {
  getBrew,
  insertBrew,
  EXECUTED_PARAM_KEYS,
  type Brew,
  type BrewInput,
} from "../repos/brews.js";
import {
  createVersion,
  getRecipeForCoffee,
  getVersionById,
  paramsOf,
  type RecipeKind,
  type RecipeVersion,
} from "../repos/recipeVersions.js";

/**
 * Record a brew.
 *
 * The recipe version it points at is resolved here rather than asked for: with a
 * recipe defined, the brew belongs to the current version and its executed
 * parameters are filled in from it, which is what lets the form ask for a drain
 * time and nothing else. With no recipe yet, the brew *becomes* the first
 * version — that is flow B, and from then on the coffee is in flow A.
 *
 * Executed parameters are always stored on the brew, even when identical to the
 * recipe: the value of the log is the diff, and a diff needs both sides.
 */
export function logBrew(db: Db, coffeeId: number, input: BrewInput): Brew {
  return db.transaction(() => {
    let version: RecipeVersion | null = null;

    if (input.recipeVersionId != null) {
      version = getVersionById(db, input.recipeVersionId);
      if (!version) throw notFound("Recipe version");
      if (version.coffeeId !== coffeeId) throw badRequest("That recipe version is another coffee's");
    } else if (input.recipeVersionId === undefined) {
      version = getRecipeForCoffee(db, coffeeId);
    }

    const executed: BrewInput = { ...input };
    if (version) {
      for (const key of EXECUTED_PARAM_KEYS) {
        if (executed[key] === undefined) {
          (executed as Record<string, unknown>)[key] = version[key];
        }
      }
      executed.recipeVersionId = version.id;
    } else if (input.recipeVersionId === undefined && hasExecutedParams(input)) {
      // No recipe yet, but the brew describes one: keep it as v1 so the next
      // brew has something to point at.
      const created = createVersion(db, coffeeId, {
        ...pickExecutedParams(input),
        kind: "baseline",
        changeNote: "Created from first brew",
      });
      executed.recipeVersionId = created.id;
    }

    return insertBrew(db, coffeeId, executed);
  })();
}

function hasExecutedParams(input: BrewInput): boolean {
  return EXECUTED_PARAM_KEYS.some((k) => input[k] != null);
}

function pickExecutedParams(input: BrewInput) {
  const out: Record<string, unknown> = {};
  for (const key of EXECUTED_PARAM_KEYS) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

/**
 * Turn what actually happened into the new plan: copy a brew's executed
 * parameters into a fresh recipe version. Anything the brew has no opinion about
 * — the pour protocol, the drain target — carries over from the version it was
 * brewed against, so promoting never silently drops the protocol text.
 */
export function promoteBrew(
  db: Db,
  brewId: number,
  opts: { changeNote?: string | null; kind?: RecipeKind | null } = {}
): RecipeVersion {
  const brew = getBrew(db, brewId);
  if (!brew) throw notFound("Brew");

  const base = brew.recipeVersionId ? getVersionById(db, brew.recipeVersionId) : null;
  const executed: Record<string, unknown> = {};
  for (const key of EXECUTED_PARAM_KEYS) executed[key] = brew[key];

  return createVersion(db, brew.coffeeId, {
    ...(base ? paramsOf(base) : {}),
    ...executed,
    kind: opts.kind ?? "tweak",
    changeNote: opts.changeNote ?? `Promoted from the brew on ${brew.brewedAt.slice(0, 10)}`,
  });
}
