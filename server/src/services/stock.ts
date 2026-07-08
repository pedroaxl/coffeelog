import type { Db } from "../db/connection.js";
import { today } from "../lib/dates.js";
import { HttpError, badRequest, notFound } from "../lib/http-error.js";
import { insertUnit, type SealState, type TempState } from "../repos/units.js";

interface UnitRow {
  id: number;
  coffee_id: number;
  kind: "bag" | "tube";
  weight_g: number;
  seal_state: SealState | null;
  temp_state: TempState;
  consumed: number;
  frozen_date: string | null;
  opened_date: string | null;
}

function row(db: Db, unitId: number): UnitRow {
  const r = db.prepare("SELECT * FROM storage_units WHERE id = ?").get(unitId) as
    | UnitRow
    | undefined;
  if (!r) throw notFound("Unit");
  return r;
}

/** Change a unit's seal/temp state, keeping the frozen/opened dates consistent. */
export function setUnitState(
  db: Db,
  unitId: number,
  patch: { sealState?: SealState; tempState?: TempState }
): number {
  const r = row(db, unitId);
  if (r.consumed === 1) throw badRequest("Consumed units can't change state");

  let sealState = r.seal_state;
  let tempState = r.temp_state;
  let frozenDate = r.frozen_date;
  let openedDate = r.opened_date;

  if (patch.sealState && r.kind === "bag") {
    sealState = patch.sealState;
    if (patch.sealState === "open" && !openedDate) openedDate = today();
  }
  if (patch.tempState) {
    if (patch.tempState === "frozen" && tempState !== "frozen") frozenDate = today();
    tempState = patch.tempState;
  }

  db.prepare(
    `UPDATE storage_units SET seal_state=@sealState, temp_state=@tempState,
       frozen_date=@frozenDate, opened_date=@openedDate WHERE id=@id`
  ).run({ id: unitId, sealState, tempState, frozenDate, openedDate });
  return r.coffee_id;
}

export interface PortionInput {
  tubes: { weightG: number }[];
  tubeState: TempState;
}

/**
 * Split an open bag into Falcon tubes in one transaction. The bag's weight
 * decreases by the total; each tube gets its own weight and a fresh QR id.
 * Portioning is only allowed from a bag (frozen tubes are not portionable).
 */
export function portionBag(db: Db, unitId: number, input: PortionInput): number {
  const r = row(db, unitId);
  if (r.kind !== "bag") throw badRequest("Only a bag can be portioned into tubes");
  if (input.tubes.length === 0) throw badRequest("Add at least one tube");
  const total = input.tubes.reduce((s, t) => s + t.weightG, 0);
  if (total > r.weight_g + 1e-6) {
    throw badRequest(`Tubes total ${total} g but the bag only has ${r.weight_g} g`);
  }

  const tx = db.transaction(() => {
    // Opening a bag to portion marks it open.
    db.prepare(
      `UPDATE storage_units SET weight_g = weight_g - @total, seal_state = 'open',
        opened_date = COALESCE(opened_date, @today) WHERE id = @id`
    ).run({ id: unitId, total, today: today() });

    for (const tube of input.tubes) {
      insertUnit(db, {
        coffeeId: r.coffee_id,
        kind: "tube",
        weightG: tube.weightG,
        tempState: input.tubeState,
        frozenDate: input.tubeState === "frozen" ? today() : null,
      });
    }
  });
  tx();
  return r.coffee_id;
}

export interface ConsumeInput {
  grams?: number;
  note?: string | null;
}

/**
 * Consume from a unit. A bag subtracts grams (and persists); a tube is consumed
 * whole. Records a consumption_log row that powers Undo. Returns the log id.
 */
export function consumeUnit(
  db: Db,
  unitId: number,
  input: ConsumeInput
): { logId: number; coffeeId: number } {
  const r = row(db, unitId);
  if (r.consumed === 1) throw badRequest("Unit already consumed");

  const note = input.note?.trim() || null;

  if (r.kind === "bag") {
    const grams = input.grams;
    if (grams == null || grams <= 0) throw badRequest("Enter grams to consume");
    if (grams > r.weight_g + 1e-6) throw badRequest("Not enough left in the bag");
    const info = db.transaction(() => {
      db.prepare("UPDATE storage_units SET weight_g = weight_g - ? WHERE id = ?").run(
        grams,
        unitId
      );
      return db
        .prepare(
          `INSERT INTO consumption_log (unit_id, coffee_id, kind, grams_delta, prev_weight, notes)
           VALUES (?, ?, 'bag', ?, ?, ?)`
        )
        .run(unitId, r.coffee_id, grams, r.weight_g, note);
    })();
    return { logId: Number(info.lastInsertRowid), coffeeId: r.coffee_id };
  }

  // tube — whole consume
  const info = db.transaction(() => {
    db.prepare("UPDATE storage_units SET consumed = 1 WHERE id = ?").run(unitId);
    return db
      .prepare(
        `INSERT INTO consumption_log (unit_id, coffee_id, kind, grams_delta, prev_state, notes)
         VALUES (?, ?, 'tube', ?, ?, ?)`
      )
      .run(unitId, r.coffee_id, r.weight_g, r.temp_state, note);
  })();
  return { logId: Number(info.lastInsertRowid), coffeeId: r.coffee_id };
}

interface LogRow {
  id: number;
  unit_id: number | null;
  coffee_id: number;
  kind: "bag" | "tube";
  grams_delta: number;
  prev_weight: number | null;
  prev_state: string | null;
  undone: number;
}

/** Reverse a consume: bag grams are added back; a tube returns to its prior state. */
export function undoConsume(db: Db, logId: number): number {
  const log = db.prepare("SELECT * FROM consumption_log WHERE id = ?").get(logId) as
    | LogRow
    | undefined;
  if (!log) throw notFound("Consumption record");
  if (log.undone === 1) throw new HttpError(409, "Already undone");
  if (log.unit_id == null) throw badRequest("The unit no longer exists");

  db.transaction(() => {
    if (log.kind === "bag") {
      db.prepare("UPDATE storage_units SET weight_g = weight_g + ? WHERE id = ?").run(
        log.grams_delta,
        log.unit_id
      );
    } else {
      db.prepare("UPDATE storage_units SET consumed = 0, temp_state = ? WHERE id = ?").run(
        log.prev_state ?? "frozen",
        log.unit_id
      );
    }
    db.prepare("UPDATE consumption_log SET undone = 1 WHERE id = ?").run(logId);
  })();
  return log.coffee_id;
}
