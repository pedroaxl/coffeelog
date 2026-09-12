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
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  -- Active recipe version. Denormalized pointer: the version rows are immutable
  -- history, this says which one is "the recipe" right now.
  current_recipe_version_id INTEGER REFERENCES recipe_versions(id) ON DELETE SET NULL
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

-- A recipe is append-only history: every row is an immutable snapshot of the
-- plan, and a brew points at the version that produced it. Deliberately
-- denormalized — immutability is the whole point, so nothing here is shared.
-- A version with no brew yet is a draft and stays editable; once a brew points
-- at it, it is history and writes fork a new version instead (see repos).
CREATE TABLE IF NOT EXISTS recipe_versions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  coffee_id       INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,   -- 1-based per coffee; shown as v1, v2…
  change_note     TEXT,                         -- why this re-dial happened
  -- 'tweak' = one variable moved from the previous version, so the two compare;
  -- 'baseline' = a reset, don't read it as a dial-in step.
  kind            TEXT NOT NULL DEFAULT 'tweak' CHECK (kind IN ('baseline','tweak')),
  brew_type       TEXT,               -- 'filter' | 'espresso'
  method          TEXT,
  dose_g          REAL,
  yield_g         REAL,
  water_temp_c    REAL,
  grinder         TEXT,
  grinder_setting TEXT,
  filter_name     TEXT,               -- exposed as "filter" in JSON; FILTER is SQL syntax
  drain_target_min_sec INTEGER,
  drain_target_max_sec INTEGER,
  protocol        TEXT,               -- free text (markdown ok)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  superseded_at   TEXT                -- set when another version takes the pointer
);

CREATE INDEX IF NOT EXISTS idx_recipe_versions_coffee ON recipe_versions(coffee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_versions_number
  ON recipe_versions(coffee_id, version);

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

-- What actually happened in the cup. Fields are split into three layers by how
-- much friction they add at brew time: layer 1 is all the Save button needs,
-- layer 2 the executed parameters (stored always, even when identical to the
-- recipe, so a diff can be shown), layer 3 the optional detail.
CREATE TABLE IF NOT EXISTS brews (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  coffee_id          INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  -- Null only for notes migrated from v1 consumption events: they predate
  -- versioning and have nothing truthful to point at.
  recipe_version_id  INTEGER REFERENCES recipe_versions(id) ON DELETE SET NULL,
  unit_id            INTEGER REFERENCES storage_units(id) ON DELETE SET NULL,
  -- Set when the brew and the consume were the same gesture, so undoing the
  -- consume undoes the whole gesture.
  consumption_log_id INTEGER REFERENCES consumption_log(id) ON DELETE SET NULL,

  -- layer 1
  brewed_at          TEXT NOT NULL DEFAULT (datetime('now')),
  drain_time_sec     INTEGER,
  notes              TEXT,
  rating             INTEGER,          -- nullable 1..5

  -- layer 2 — executed parameters, pre-filled from the recipe version
  brew_type          TEXT,
  method             TEXT,
  dose_g             REAL,
  yield_g            REAL,
  water_temp_c       REAL,
  grinder            TEXT,
  grinder_setting    TEXT,
  filter_name        TEXT,
  bloom_sec          INTEGER,

  -- layer 3 — optional detail
  wdt                TEXT,             -- 'none' | 'inGrounds' | 'inBed'
  paragon            TEXT,             -- 'no' | 'underDripper' | 'afterDrain'
  dripper_lifted     INTEGER,
  tds                REAL,             -- %
  beverage_g         REAL,             -- weight in the cup, not water poured
  acid_bitter        INTEGER,          -- -2..+2
  astringency        INTEGER,          -- 0..3
  body               INTEGER,          -- -1..+1
  sweetness          INTEGER,          -- 0..3
  channeling         INTEGER,
  -- A channeled bed is unreadable — the brew stays in the history but is
  -- excluded from comparisons, averages and charts.
  valid_for_dial_in  INTEGER NOT NULL DEFAULT 1,
  discard_reason     TEXT,
  next_action        TEXT,             -- the adjustment decided on, e.g. "open to 6.0"
  experiment_tag     TEXT,             -- free label grouping comparable brews
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_brews_coffee ON brews(coffee_id, brewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_brews_version ON brews(recipe_version_id);
CREATE INDEX IF NOT EXISTS idx_brews_log ON brews(consumption_log_id);
CREATE INDEX IF NOT EXISTS idx_brews_tag ON brews(experiment_tag);

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
  process_options           TEXT NOT NULL DEFAULT '[]',   -- JSON array
  filter_options            TEXT NOT NULL DEFAULT '[]'    -- JSON array
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

export const DEFAULT_FILTER_OPTIONS = [
  "Cafec Abaca",
  "Origami Wave",
  "V60 Tabbed",
  "Kalita Wave 185",
];

export const DEFAULT_PROCESS_OPTIONS = [
  "Natural",
  "Washed",
  "Honey",
  "Anaerobic",
  "Pulped Natural",
];
