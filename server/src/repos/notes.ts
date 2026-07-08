import type { Db } from "../db/connection.js";

export function getNotes(db: Db, coffeeId: number): string[] {
  const rows = db
    .prepare("SELECT label FROM tasting_notes WHERE coffee_id = ? ORDER BY position ASC, id ASC")
    .all(coffeeId) as { label: string }[];
  return rows.map((r) => r.label);
}

/** Replace the full ordered set of tasting-note chips for a coffee. */
export function replaceNotes(db: Db, coffeeId: number, notes: string[]): void {
  const cleaned = notes.map((n) => n.trim()).filter(Boolean);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM tasting_notes WHERE coffee_id = ?").run(coffeeId);
    const insert = db.prepare(
      "INSERT INTO tasting_notes (coffee_id, label, position) VALUES (?, ?, ?)"
    );
    cleaned.forEach((label, i) => insert.run(coffeeId, label, i));
  });
  tx();
}
