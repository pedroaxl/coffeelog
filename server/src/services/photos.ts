import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { newQrId } from "../lib/ids.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/** Multer middleware that stores a single "photo" upload into the data dir. */
export function photoUpload(uploadsDir: string) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${newQrId()}${EXT[file.mimetype] ?? ""}`),
  });
  return multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
  });
}

/** Public URL path served by express.static("/uploads"). */
export function photoUrl(filename: string): string {
  return `/uploads/${path.basename(filename)}`;
}

/** Remove a previously stored photo (best-effort). */
export function removePhoto(uploadsDir: string, photoPath: string | null): void {
  if (!photoPath) return;
  const filename = path.basename(photoPath);
  const full = path.join(uploadsDir, filename);
  if (full.startsWith(uploadsDir) && fs.existsSync(full)) {
    try {
      fs.unlinkSync(full);
    } catch {
      /* ignore */
    }
  }
}
