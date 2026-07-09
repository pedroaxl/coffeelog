/**
 * SQLite schema for CoffeeLog. Dates are stored as ISO-8601 strings, booleans as
 * INTEGER 0/1. The whole database lives in a single file for easy snapshot/backup.
 */
export const SCHEMA_SQL = /* sql */ `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS coffees (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  roaster          TEXT,
  variety          TEXT,
  process          TEXT,
  bean_region      TEXT,
  bean_country     TEXT,
  roastery_name    TEXT,
  roastery_country TEXT,
  altitude_m       INTEGER,
  roast_level      TEXT,
  roast_date       TEXT,
  purchase_date    TEXT,
  photo_path       TEXT,
  score            INTEGER,           -- nullable 1..5, editable anytime
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coffee_photos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  coffee_id  INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,     -- 0 = cover
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_coffee ON coffee_photos(coffee_id);

CREATE TABLE IF NOT EXISTS tasting_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  coffee_id  INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

-- Recipes live in their own table keyed by id with a coffee_id FK. v1 keeps one
-- recipe per coffee in the UI, but the shape is already 1:N-ready.
CREATE TABLE IF NOT EXISTS recipes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  coffee_id       INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  brew_type       TEXT,               -- 'filter' | 'espresso'
  method          TEXT,
  dose_g          REAL,
  yield_g         REAL,
  water_temp_c    REAL,
  grinder         TEXT,
  grinder_setting TEXT,
  protocol        TEXT,               -- free text (markdown ok)
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS storage_units (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  coffee_id    INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('bag','tube')),
  weight_g     REAL NOT NULL,
  qr_id        TEXT NOT NULL UNIQUE,
  seal_state   TEXT CHECK (seal_state IN ('sealed','open')),        -- bag only
  temp_state   TEXT NOT NULL CHECK (temp_state IN ('frozen','defrosted')),
  consumed     INTEGER NOT NULL DEFAULT 0,                          -- tubes: whole-consume
  frozen_date  TEXT,
  opened_date  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_units_coffee ON storage_units(coffee_id);

CREATE TABLE IF NOT EXISTS consumption_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id      INTEGER REFERENCES storage_units(id) ON DELETE SET NULL,
  coffee_id    INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('bag','tube')),
  grams_delta  REAL NOT NULL,          -- grams removed (positive)
  prev_weight  REAL,                   -- bag weight before consume (for undo)
  prev_state   TEXT,                   -- tube temp_state before consume (for undo)
  notes        TEXT,                   -- optional: how the brew went / reminders
  undone       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single-row settings (id = 1).
CREATE TABLE IF NOT EXISTS settings (
  id                        INTEGER PRIMARY KEY CHECK (id = 1),
  instance_url              TEXT NOT NULL DEFAULT '',
  warn_not_frozen_after_days INTEGER NOT NULL DEFAULT 3,
  warn_frozen_over_days     INTEGER NOT NULL DEFAULT 40,
  label_width_mm            REAL NOT NULL DEFAULT 50,
  label_height_mm           REAL NOT NULL DEFAULT 30,
  label_dpi                 INTEGER NOT NULL DEFAULT 300,
  weight_unit               TEXT NOT NULL DEFAULT 'g',
  printer_device            TEXT NOT NULL DEFAULT 'Niimbot B1',
  method_options            TEXT NOT NULL DEFAULT '[]',   -- JSON array
  grinder_options           TEXT NOT NULL DEFAULT '[]',   -- JSON array
  variety_options           TEXT NOT NULL DEFAULT '[]',   -- JSON array
  process_options           TEXT NOT NULL DEFAULT '[]'    -- JSON array
);
`;

/** Real defaults for the user-managed option lists (see brief's corrections). */
export const DEFAULT_METHOD_OPTIONS = [
  "V60 02",
  "Origami (Conical)",
  "Origami (Wave)",
  "Hario Switch",
  "Timemore B75",
];

export const DEFAULT_GRINDER_OPTIONS = ["1Zpresso ZP6", "1Zpresso K-Ultra"];

export const DEFAULT_VARIETY_OPTIONS = [
  "Bourbon",
  "Yellow Bourbon",
  "Catuaí",
  "Caturra",
  "Geisha",
  "Typica",
  "Mundo Novo",
  "SL28",
  "Pacamara",
];

export const DEFAULT_PROCESS_OPTIONS = [
  "Natural",
  "Washed",
  "Honey",
  "Anaerobic",
  "Pulped Natural",
];
