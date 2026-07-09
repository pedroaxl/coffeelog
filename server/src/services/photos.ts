import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { newQrId } from "../lib/ids.js";

/**
 * Accept the upload into memory (no disk write yet, no mimetype gate). sharp
 * validates and converts it, so HEIC from an iPhone, PNG, WebP, etc. all work.
 */
export function photoUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 },
  });
}

/**
 * Convert an uploaded image to a web-friendly JPEG: auto-orient from EXIF,
 * downscale to a sane max, and store under the data dir. Returns the public URL.
 * Throws if the buffer isn't a decodable image.
 */
export async function savePhoto(uploadsDir: string, file: Express.Multer.File): Promise<string> {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${Date.now()}-${newQrId()}.jpg`;
  // Keep a high-resolution copy: rich enough for the detail hero on hi-DPI
  // screens and to zoom in and read package fine print, while still compressing
  // multi-megabyte phone photos to a sensible size.
  await sharp(file.buffer)
    .rotate() // honor EXIF orientation (phone photos)
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(uploadsDir, filename));
  return photoUrl(filename);
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
