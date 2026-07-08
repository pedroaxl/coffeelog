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
}

export type UnitKind = "bag" | "tube";
export type SealState = "sealed" | "open";
export type TempState = "frozen" | "defrosted";
export type UnitStatus = "open" | "frozen" | "defrosted" | "consumed";

export interface Recipe {
  id: number;
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  ratio: number | null; // derived
  waterTempC: number | null;
  grinder: string | null;
  grinderSetting: string | null;
  protocol: string | null;
}

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
  photoPath: string | null;
  score: number | null;
  createdAt: string;
  tastingNotes: string[];
  recipe: Recipe | null;
  units: StorageUnit[];
  remainingG: number;
  activeUnitCount: number;
  status: "available" | "archived"; // derived
}
