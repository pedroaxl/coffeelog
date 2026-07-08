import type { Db } from "../db/connection.js";
import { newQrId } from "../lib/ids.js";

export type UnitKind = "bag" | "tube";
export type SealState = "sealed" | "open";
export type TempState = "frozen" | "defrosted";
export type UnitStatus = "open" | "frozen" | "defrosted" | "consumed";

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
  status: UnitStatus;
  active: boolean;
}

interface UnitRow {
  id: number;
  coffee_id: number;
  kind: UnitKind;
  weight_g: number;
  qr_id: string;
  seal_state: SealState | null;
  temp_state: TempState;
  consumed: number;
  frozen_date: string | null;
  opened_date: string | null;
}

/** A unit still counts toward stock while it isn't consumed and has weight left. */
export function isActive(row: Pick<UnitRow, "consumed" | "weight_g">): boolean {
  return row.consumed === 0 && row.weight_g > 0;
}

/** Single label used by the status-color system across the UI. */
export function deriveStatus(row: UnitRow): UnitStatus {
  if (row.consumed === 1 || row.weight_g <= 0) return "consumed";
  if (row.temp_state === "frozen") return "frozen";
  if (row.kind === "bag" && row.seal_state === "open") return "open";
  return "defrosted";
}

export function mapUnit(row: UnitRow): StorageUnit {
  return {
    id: row.id,
    coffeeId: row.coffee_id,
    kind: row.kind,
    weightG: row.weight_g,
    qrId: row.qr_id,
    sealState: row.seal_state,
    tempState: row.temp_state,
    consumed: row.consumed === 1,
    frozenDate: row.frozen_date,
    openedDate: row.opened_date,
    status: deriveStatus(row),
    active: isActive(row),
  };
}

export function listUnitsByCoffee(db: Db, coffeeId: number): StorageUnit[] {
  const rows = db
    .prepare("SELECT * FROM storage_units WHERE coffee_id = ? ORDER BY kind DESC, id ASC")
    .all(coffeeId) as UnitRow[];
  return rows.map(mapUnit);
}

export function getUnit(db: Db, id: number): StorageUnit | undefined {
  const row = db.prepare("SELECT * FROM storage_units WHERE id = ?").get(id) as
    | UnitRow
    | undefined;
  return row ? mapUnit(row) : undefined;
}

export function coffeeIdForUnit(db: Db, id: number): number | undefined {
  const row = db.prepare("SELECT coffee_id FROM storage_units WHERE id = ?").get(id) as
    | { coffee_id: number }
    | undefined;
  return row?.coffee_id;
}

export function coffeeIdForQr(db: Db, qrId: string): number | undefined {
  const row = db.prepare("SELECT coffee_id FROM storage_units WHERE qr_id = ?").get(qrId) as
    | { coffee_id: number }
    | undefined;
  return row?.coffee_id;
}

export function unitIdForQr(db: Db, qrId: string): number | undefined {
  const row = db.prepare("SELECT id FROM storage_units WHERE qr_id = ?").get(qrId) as
    | { id: number }
    | undefined;
  return row?.id;
}

export interface CreateUnitInput {
  coffeeId: number;
  kind: UnitKind;
  weightG: number;
  sealState?: SealState | null;
  tempState: TempState;
  frozenDate?: string | null;
  openedDate?: string | null;
}

export function insertUnit(db: Db, input: CreateUnitInput): StorageUnit {
  const info = db
    .prepare(
      `INSERT INTO storage_units
        (coffee_id, kind, weight_g, qr_id, seal_state, temp_state, frozen_date, opened_date)
       VALUES (@coffeeId, @kind, @weightG, @qrId, @sealState, @tempState, @frozenDate, @openedDate)`
    )
    .run({
      coffeeId: input.coffeeId,
      kind: input.kind,
      weightG: input.weightG,
      qrId: newQrId(),
      sealState: input.kind === "bag" ? input.sealState ?? "sealed" : null,
      tempState: input.tempState,
      frozenDate: input.frozenDate ?? null,
      openedDate: input.openedDate ?? null,
    });
  return getUnit(db, Number(info.lastInsertRowid))!;
}
