import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import QRCode from "qrcode";
import type { Settings } from "../repos/settings.js";
import type { Coffee } from "../repos/coffees.js";
import type { StorageUnit } from "../repos/units.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Same relative path works from both src/ (tsx dev) and dist/ (prod build).
const FONT_DIR = path.resolve(__dirname, "../../assets/fonts");

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "IBMPlexSans.ttf"), "IBM Plex Sans");
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "Spectral-SemiBold.ttf"), "Spectral");
  fontsRegistered = true;
}

/** The URL a label's QR encodes — opens the unit when scanned by a phone camera. */
export function buildQrUrl(settings: Settings, origin: string, qrId: string): string {
  const base = (settings.instanceUrl || origin || "").replace(/\/+$/, "");
  const prefix = base && !/^https?:\/\//.test(base) ? `http://${base}` : base;
  return `${prefix}/u/${qrId}`;
}

const mmToPx = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);
const shortDate = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

const STATE_TEXT: Record<StorageUnit["status"], string> = {
  open: "Open",
  frozen: "Frozen",
  defrosted: "Defrosted",
  consumed: "Consumed",
};

/**
 * Compose a label PNG (QR + weight + coffee name + roaster + freeze date) at the
 * size configured in Settings. Self-contained: uses bundled fonts, no system deps.
 */
export async function renderLabelPng(
  unit: StorageUnit,
  coffee: Coffee,
  settings: Settings,
  qrUrl: string
): Promise<Buffer> {
  ensureFonts();

  const W = mmToPx(settings.labelWidthMm, settings.labelDpi);
  const H = mmToPx(settings.labelHeightMm, settings.labelDpi);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const pad = Math.round(H * 0.08);
  // Keep the QR compact enough to leave room for text on a landscape label.
  const qrSize = Math.min(H - pad * 2, Math.round(W * 0.42));
  const qrY = Math.round((H - qrSize) / 2);

  // QR (left, vertically centered)
  const qrBuffer = await QRCode.toBuffer(qrUrl, { type: "png", margin: 1, width: qrSize });
  const qrImg = await loadImage(qrBuffer);
  ctx.drawImage(qrImg, pad, qrY, qrSize, qrSize);

  // Text block (right of the QR)
  const tx = pad + qrSize + Math.round(pad * 0.8);
  const tw = W - tx - pad;
  ctx.fillStyle = "#1a130d";
  ctx.textBaseline = "alphabetic";

  let y = pad + Math.round(H * 0.26);
  ctx.font = `${Math.round(H * 0.26)}px Spectral`;
  const weightText = `${Number.isInteger(unit.weightG) ? unit.weightG : unit.weightG.toFixed(1)} g`;
  ctx.fillText(fit(ctx, weightText, tw), tx, y);

  y += Math.round(H * 0.2);
  ctx.font = `600 ${Math.round(H * 0.13)}px "IBM Plex Sans"`;
  ctx.fillText(fit(ctx, coffee.name, tw), tx, y);

  if (coffee.roaster) {
    y += Math.round(H * 0.15);
    ctx.fillStyle = "#6b5b49";
    ctx.font = `${Math.round(H * 0.11)}px "IBM Plex Sans"`;
    ctx.fillText(fit(ctx, coffee.roaster, tw), tx, y);
  }

  // state + date line
  const dateIso = unit.frozenDate ?? unit.openedDate;
  const stateLine = `${STATE_TEXT[unit.status]}${dateIso ? ` ${shortDate(dateIso)}` : ""}`;
  y += Math.round(H * 0.16);
  ctx.fillStyle = "#5b7b8c";
  ctx.font = `600 ${Math.round(H * 0.1)}px "IBM Plex Sans"`;
  ctx.fillText(stateLine, tx, y);

  return canvas.toBuffer("image/png");
}

/** Truncate text with an ellipsis to fit a max pixel width. */
function fit(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

export function labelFilename(coffee: Coffee, unit: StorageUnit): string {
  const slug = coffee.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "coffee";
  return `${slug}-${unit.weightG}g-${unit.qrId}.png`;
}
