import type { Db } from "../db/connection.js";

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

interface SettingsRow {
  instance_url: string;
  warn_not_frozen_after_days: number;
  warn_frozen_over_days: number;
  label_width_mm: number;
  label_height_mm: number;
  label_dpi: number;
  weight_unit: string;
  printer_device: string;
  method_options: string;
  grinder_options: string;
}

function mapRow(row: SettingsRow): Settings {
  return {
    instanceUrl: row.instance_url,
    warnNotFrozenAfterDays: row.warn_not_frozen_after_days,
    warnFrozenOverDays: row.warn_frozen_over_days,
    labelWidthMm: row.label_width_mm,
    labelHeightMm: row.label_height_mm,
    labelDpi: row.label_dpi,
    weightUnit: row.weight_unit,
    printerDevice: row.printer_device,
    methodOptions: safeParseArray(row.method_options),
    grinderOptions: safeParseArray(row.grinder_options),
  };
}

function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function getSettings(db: Db): Settings {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow;
  return mapRow(row);
}

export interface SettingsPatch {
  instanceUrl?: string;
  warnNotFrozenAfterDays?: number;
  warnFrozenOverDays?: number;
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelDpi?: number;
  weightUnit?: string;
  printerDevice?: string;
  methodOptions?: string[];
  grinderOptions?: string[];
}

const COLUMN_MAP: Record<keyof SettingsPatch, string> = {
  instanceUrl: "instance_url",
  warnNotFrozenAfterDays: "warn_not_frozen_after_days",
  warnFrozenOverDays: "warn_frozen_over_days",
  labelWidthMm: "label_width_mm",
  labelHeightMm: "label_height_mm",
  labelDpi: "label_dpi",
  weightUnit: "weight_unit",
  printerDevice: "printer_device",
  methodOptions: "method_options",
  grinderOptions: "grinder_options",
};

export function updateSettings(db: Db, patch: SettingsPatch): Settings {
  const sets: string[] = [];
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch) as [keyof SettingsPatch, unknown][]) {
    if (value === undefined) continue;
    const column = COLUMN_MAP[key];
    sets.push(`${column} = @${key}`);
    params[key] = Array.isArray(value) ? JSON.stringify(value) : value;
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE settings SET ${sets.join(", ")} WHERE id = 1`).run(params);
  }
  return getSettings(db);
}
