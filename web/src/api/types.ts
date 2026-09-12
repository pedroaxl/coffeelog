export interface Settings {
  instanceUrl: string;
  warnNotFrozenAfterDays: number;
  warnFrozenOverDays: number;
  labelWidthMm: number;
  labelHeightMm: number;
  labelDpi: number;
  weightUnit: string;
  printerDevice: string;
  methodOptions: string[];
  grinderOptions: string[];
  varietyOptions: string[];
  processOptions: string[];
  filterOptions: string[];
}

export type UnitKind = "bag" | "tube";
export type SealState = "sealed" | "open";
export type TempState = "frozen" | "defrosted";
export type UnitStatus = "open" | "frozen" | "defrosted" | "consumed";

export type BrewType = "filter" | "espresso";

export type RecipeKind = "baseline" | "tweak";

/**
 * One version of a coffee's recipe. `coffee.recipe` is the active one; the
 * others are history. A version with no brew yet is a draft and can be edited in
 * place — once `brewCount` is above zero it is frozen and a write forks a new
 * version.
 */
export interface Recipe {
  id: number;
  coffeeId: number;
  version: number;
  changeNote: string | null;
  kind: RecipeKind;
  brewType: BrewType | null;
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  ratio: number | null; // derived
  waterTempC: number | null;
  grinder: string | null;
  grinderSetting: string | null;
  filter: string | null;
  drainTargetMinSec: number | null;
  drainTargetMaxSec: number | null;
  protocol: string | null;
  createdAt: string;
  supersededAt: string | null;
  brewCount: number;
  isCurrent: boolean;
}

/** What a recipe write accepts: the parameters, plus why it changed. */
export type RecipeInput = Partial<
  Omit<
    Recipe,
    | "id"
    | "coffeeId"
    | "version"
    | "ratio"
    | "createdAt"
    | "supersededAt"
    | "brewCount"
    | "isCurrent"
  >
>;

export interface StorageUnit {
  id: number;
  coffeeId: number;
  kind: UnitKind;
  weightG: number;
  qrId: string;
  sealState: SealState | null;
  tempState: TempState;
  consumed: boolean;
  frozenDate: string | null;
  openedDate: string | null;
  status: UnitStatus; // derived label used by the status-color system
  active: boolean;
}

export interface ConsumptionNote {
  date: string; // YYYY-MM-DD
  note: string;
}

export interface Coffee {
  id: number;
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
  photoPath: string | null; // cover (photos[0])
  photos: string[];
  score: number | null;
  createdAt: string;
  lastUsedAt: string | null;
  tastingNotes: string[];
  recipe: Recipe | null;
  units: StorageUnit[];
  remainingG: number;
  activeUnitCount: number;
  brewCount: number;
  lastBrewedAt: string | null;
  consumptionNotes: ConsumptionNote[]; // deprecated — use the brew list
  status: "available" | "archived"; // derived
}

export type Wdt = "none" | "inGrounds" | "inBed";
export type Paragon = "no" | "underDripper" | "afterDrain";

/** What actually happened in the cup, against the recipe version that planned it. */
export interface Brew {
  id: number;
  coffeeId: number;
  recipeVersionId: number | null;
  recipeVersion: number | null;
  unitId: number | null;
  consumptionLogId: number | null;

  brewedAt: string;
  drainTimeSec: number | null;
  notes: string | null;
  rating: number | null;

  brewType: BrewType | null;
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  ratio: number | null;
  waterTempC: number | null;
  grinder: string | null;
  grinderSetting: string | null;
  filter: string | null;
  bloomSec: number | null;

  wdt: Wdt | null;
  paragon: Paragon | null;
  dripperLifted: boolean | null;
  tds: number | null;
  beverageG: number | null;
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
 * What a brew write accepts. Executed parameters left out are filled in from the
 * recipe version being brewed, which is what keeps the common case to one field.
 */
export type BrewInput = Partial<
  Omit<
    Brew,
    | "id"
    | "coffeeId"
    | "recipeVersion"
    | "consumptionLogId"
    | "ratio"
    | "extractionYield"
    | "createdAt"
  >
>;

export interface Alerts {
  portionFreeze: Coffee[];
  frozenTooLong: Coffee[];
}

export interface ConsumeResult {
  coffee: Coffee;
  logId: number;
  brewId: number | null;
}
