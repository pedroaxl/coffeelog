import type { Db } from "../db/connection.js";

/** Ordered photo paths for a coffee (index 0 is the cover). */
export function listPhotoPaths(db: Db, coffeeId: number): string[] {
  const rows = db
    .prepare("SELECT path FROM coffee_photos WHERE coffee_id = ? ORDER BY position ASC, id ASC")
    .all(coffeeId) as { path: string }[];
  return rows.map((r) => r.path);
}

export function addPhoto(db: Db, coffeeId: number, path: string): void {
  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM coffee_photos WHERE coffee_id = ?")
    .get(coffeeId) as { m: number };
  db.prepare("INSERT INTO coffee_photos (coffee_id, path, position) VALUES (?, ?, ?)").run(
    coffeeId,
    path,
    max.m + 1
  );
}

export function hasPhoto(db: Db, coffeeId: number, path: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM coffee_photos WHERE coffee_id = ? AND path = ?")
    .get(coffeeId, path);
}

export function removePhotoRow(db: Db, coffeeId: number, path: string): boolean {
  const info = db
    .prepare("DELETE FROM coffee_photos WHERE coffee_id = ? AND path = ?")
    .run(coffeeId, path);
  return info.changes > 0;
}

/** Move a photo to the front (cover), renumbering positions. */
export function setPrimaryPhoto(db: Db, coffeeId: number, path: string): void {
  const paths = listPhotoPaths(db, coffeeId);
  if (!paths.includes(path)) return;
  const reordered = [path, ...paths.filter((p) => p !== path)];
  const update = db.prepare("UPDATE coffee_photos SET position = ? WHERE coffee_id = ? AND path = ?");
  db.transaction(() => {
    reordered.forEach((p, i) => update.run(i, coffeeId, p));
  })();
}

/** Remove all photo rows for a coffee and return their paths (for file cleanup). */
export function removeAllPhotoRows(db: Db, coffeeId: number): string[] {
  const paths = listPhotoPaths(db, coffeeId);
  db.prepare("DELETE FROM coffee_photos WHERE coffee_id = ?").run(coffeeId);
  return paths;
}
