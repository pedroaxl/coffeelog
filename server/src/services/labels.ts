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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Full date including the year, e.g. "08 Jul 2026". */
const fullDate = (iso: string | null): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
};

const STATE_TEXT: Record<StorageUnit["status"], string> = {
  open: "Opened",
  frozen: "Frozen",
  defrosted: "Defrosted",
  consumed: "Consumed",
};

const STATE_COLOR: Record<StorageUnit["status"], string> = {
  open: "#be6a3a",
  frozen: "#5b7b8c",
  defrosted: "#b07a1c",
  consumed: "#a99c8d",
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

  const pad = Math.round(H * 0.09);
  // Compact QR so the coffee name (the primary info) has room to breathe.
  const qrSize = Math.min(H - pad * 2, Math.round(W * 0.36));
  const qrY = Math.round((H - qrSize) / 2);

  // QR (left, vertically centered)
  const qrBuffer = await QRCode.toBuffer(qrUrl, { type: "png", margin: 1, width: qrSize });
  const qrImg = await loadImage(qrBuffer);
  ctx.drawImage(qrImg, pad, qrY, qrSize, qrSize);

  // Text block (right of the QR), stacked top-down.
  const tx = pad + qrSize + Math.round(pad * 0.9);
  const tw = W - tx - pad;
  ctx.textBaseline = "top";

  // 1) Coffee NAME — primary, up to two auto-shrinking lines.
  const name = layoutName(ctx, coffee.name, tw, H);
  const nameLineH = Math.round(name.fontPx * 1.06);
  ctx.fillStyle = "#1a130d";
  ctx.font = `600 ${name.fontPx}px "IBM Plex Sans"`;
  let y = pad;
  for (const line of name.lines) {
    ctx.fillText(line, tx, y);
    y += nameLineH;
  }

  // 2) Roaster — shrink to fit the width so the full name shows.
  if (coffee.roaster) {
    y += Math.round(H * 0.04);
    const px = fitFont(ctx, coffee.roaster, tw, Math.round(H * 0.105), Math.round(H * 0.075), "500");
    ctx.fillStyle = "#6b5b49";
    ctx.font = `500 ${px}px "IBM Plex Sans"`;
    ctx.fillText(fit(ctx, coffee.roaster, tw), tx, y);
    y += px;
  }

  // 3) State + date (with year) — e.g. "Frozen 08 Jul 2026". Shrink so the
  //    full date (including the year) always fits, never truncated.
  const dateIso = unit.frozenDate ?? unit.openedDate;
  const stateLine = `${STATE_TEXT[unit.status]}${dateIso ? ` ${fullDate(dateIso)}` : ""}`;
  y += Math.round(H * 0.06);
  const stmtPx = fitFont(ctx, stateLine, tw, Math.round(H * 0.115), Math.round(H * 0.06), "600");
  ctx.fillStyle = STATE_COLOR[unit.status];
  ctx.font = `600 ${stmtPx}px "IBM Plex Sans"`;
  ctx.fillText(fit(ctx, stateLine, tw), tx, y);
  y += stmtPx;

  // 4) Weight — de-emphasized
  y += Math.round(H * 0.045);
  ctx.fillStyle = "#8a7867";
  ctx.font = `500 ${Math.round(H * 0.09)}px "IBM Plex Sans"`;
  const weightText = `${Number.isInteger(unit.weightG) ? unit.weightG : unit.weightG.toFixed(1)} g`;
  ctx.fillText(weightText, tx, y);

  return canvas.toBuffer("image/png");
}

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

/** Truncate text with an ellipsis to fit a max pixel width. */
function fit(ctx: Ctx, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

/** Largest font size in [minPx, basePx] whose text fits maxW (else minPx). */
function fitFont(ctx: Ctx, text: string, maxW: number, basePx: number, minPx: number, weight: string): number {
  for (let px = basePx; px > minPx; px -= 1) {
    ctx.font = `${weight} ${px}px "IBM Plex Sans"`;
    if (ctx.measureText(text).width <= maxW) return px;
  }
  return minPx;
}

/** Greedy word-wrap into lines that fit maxW (a lone over-wide word is kept). */
function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (!cur || ctx.measureText(test).width <= maxW) cur = test;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Fit the coffee name into at most two lines: pick the largest font size that
 * wraps cleanly; if even the smallest doesn't, clamp to two lines and ellipsize.
 */
function layoutName(ctx: Ctx, text: string, maxW: number, H: number): { lines: string[]; fontPx: number } {
  const maxPx = Math.max(16, Math.round(H * 0.18));
  const minPx = Math.max(11, Math.round(H * 0.095));
  for (let px = maxPx; px >= minPx; px -= 2) {
    ctx.font = `600 ${px}px "IBM Plex Sans"`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxW)) {
      return { lines, fontPx: px };
    }
  }
  ctx.font = `600 ${minPx}px "IBM Plex Sans"`;
  const wrapped = wrap(ctx, text, maxW);
  const lines = wrapped.slice(0, 2).map((l, i) => (i === 1 && wrapped.length > 2 ? fit(ctx, `${l}…`, maxW) : fit(ctx, l, maxW)));
  return { lines, fontPx: minPx };
}

export function labelFilename(coffee: Coffee, unit: StorageUnit): string {
  const slug = coffee.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "coffee";
  return `${slug}-${unit.weightG}g-${unit.qrId}.png`;
}
