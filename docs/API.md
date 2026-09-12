# CoffeeLog HTTP API

Everything the app does goes through this API, and it is meant to be driven from
outside too — a script or an agent session can read the catalog and write
recipes and brews. Single user, no authentication: keep the instance on a
trusted network.

- Base path: `/api`
- JSON in, JSON out; writes need `Content-Type: application/json`
- Enum values (methods, grinders, filters, varieties, processes) come from
  `GET /settings`. Send the exact strings — nothing is normalised.

## Model

```
coffee
 ├── recipe            the active recipe_version (what "the recipe" means)
 ├── recipe_versions[] append-only history, v1, v2, v3…
 ├── brews[]           what actually happened, each pointing at the version used
 ├── units[]           bag | tube, several at once
 │    └── consume      stock event, undoable, may carry a brew
 └── photos[]
```

Two rules shape everything else:

- **Recipe is the plan, brew is what happened.** They carry the same
  parameters; the value is in the diff.
- **A recipe version with no brew is a draft** and can be edited in place. Once
  a brew points at it, it is frozen — writes fork a new version instead.

## Coffees

```
GET    /api/coffees                 list, each with its active recipe and units
GET    /api/coffees/<id>            one coffee
POST   /api/coffees                 create (accepts tastingNotes, recipe, initialUnit)
PATCH  /api/coffees/<id>            patch fields; an embedded `recipe` follows the draft/frozen rule
PATCH  /api/coffees/<id>/score      { "score": 1..5 | null }
DELETE /api/coffees/<id>
POST   /api/coffees/<id>/units      add another bag { kind, weightG, initialState }
POST   /api/coffees/<id>/photos     multipart, field "photos"
DELETE /api/coffees/<id>/photos     { "path": "/uploads/..." }
PATCH  /api/coffees/<id>/photos/primary   { "path": "/uploads/..." }
```

A coffee carries `remainingG`, `activeUnitCount`, `status`, `brewCount`,
`lastBrewedAt`, and `consumptionNotes` (**deprecated** — derived from brews plus
any plain consume note; use the brew list instead).

## Recipe versions

```
GET   /api/coffees/<id>/recipe/versions            history, newest first
GET   /api/coffees/<id>/recipe/versions/<version>  one version + the brews it produced
POST  /api/coffees/<id>/recipe                     new version (201)
PATCH /api/coffees/<id>/recipe                     edit the current version, or fork it
PUT   /api/coffees/<id>/recipe                     alias of POST, kept for v1 scripts (200)
```

A version:

| field | notes |
|---|---|
| `version` | 1-based per coffee; what the UI shows as v1, v2… |
| `changeNote` | why you re-dialed. One line, never inherited by the next version. |
| `kind` | `tweak` (one variable moved, comparable with the previous version) or `baseline` (a reset). Defaults to `baseline` for the first version, `tweak` after that. |
| `brewType` | `filter` \| `espresso` \| `null` |
| `method`, `doseG`, `yieldG`, `waterTempC`, `grinder`, `grinderSetting`, `filter` | the plan |
| `drainTargetMinSec`, `drainTargetMaxSec` | target drawdown window, in seconds |
| `protocol` | free text (markdown ok) — pour cadence, technique, notes |
| `ratio` | derived from `yieldG / doseG`, never sent |
| `brewCount` | zero means the version is still a draft |
| `isCurrent`, `createdAt`, `supersededAt` | |

**POST replaces wholesale** — a parameter you leave out is stored as null.
**PATCH merges** — keys you leave out keep their value, an explicit `null`
clears. Both answer with the whole coffee; read `coffee.recipe.version` to see
whether a version was created.

```bash
# re-dial: v1 has brews, so this forks v2
curl -X PATCH https://coffeelog.home.lan/api/coffees/9/recipe \
  -H 'content-type: application/json' \
  -d '{"grinderSetting":"6.0","changeNote":"amargou no final, abri a moagem"}'
```

## Brews

```
GET    /api/coffees/<id>/brews?validOnly=&limit=   newest first
POST   /api/coffees/<id>/brews                     log a brew (201)
GET    /api/brews?coffeeId=&experimentTag=&limit=  cross-coffee listing
GET    /api/brews/<id>
PATCH  /api/brews/<id>                             brews stay editable
DELETE /api/brews/<id>
POST   /api/brews/<id>/promote                     new recipe version from this brew (201)
```

Fields are grouped by how much friction they add while you are holding a kettle.

**Layer 1 — all the save needs:** `brewedAt` (defaults to now), `drainTimeSec`,
`notes`, `rating` (1–5), `unitId`, `recipeVersionId`.

**Layer 2 — executed parameters:** `brewType`, `method`, `doseG`, `yieldG`,
`waterTempC`, `grinder`, `grinderSetting`, `filter`, `bloomSec`. Anything you
leave out is **filled in from the recipe version being brewed**, and stored on
the brew either way — the log is only useful if both sides of the diff are
recorded. Editing these never touches the recipe; `POST /brews/<id>/promote`
does that explicitly.

**Layer 3 — optional detail:** `wdt` (`none` \| `inGrounds` \| `inBed`),
`paragon` (`no` \| `underDripper` \| `afterDrain`), `dripperLifted`, `tds`,
`beverageG`, `acidBitter` (−2..+2), `astringency` (0..3), `body` (−1..+1),
`sweetness` (0..3), `channeling`, `validForDialIn` (default true),
`discardReason`, `nextAction`, `experimentTag`.

Derived and returned, never sent: `ratio`, `recipeVersion` (the vN label), and
`extractionYield` = `tds × beverageG / doseG`. Note that EY uses `beverageG`,
the weight in the cup — computing it from `yieldG` (water poured) inflates it by
what the bed retains, so it is left null when `beverageG` is missing.

A brew with `validForDialIn: false` stays in the history but is excluded from
comparisons — a channeled bed can't tell you anything about grind size.

Which recipe version a brew belongs to is resolved server-side:

- `recipeVersionId` given → that one.
- Omitted, coffee has a recipe → the current version.
- Omitted, no recipe, but the brew carries parameters → they become **v1**, with
  `kind: baseline` and `changeNote: "Created from first brew"`.
- Omitted, no recipe, no parameters → no version; the brew is unlinked.
- Explicit `null` → unlinked on purpose (this is what migrated v1 notes are).

```bash
# the common case: the recipe was followed, only the drain time is news
curl -X POST https://coffeelog.home.lan/api/coffees/9/brews \
  -H 'content-type: application/json' \
  -d '{"drainTimeSec":170,"rating":4,"notes":"doce, corpo bom"}'
```

## Units, stock and consume

```
GET   /api/units/<id>               { coffee, unit }
GET   /api/scan/<qrId>              same, by the short code on the label
PATCH /api/units/<id>               { sealState, tempState, frozenDate, openedDate }
POST  /api/units/<id>/portion       { tubes: [{weightG}], tubeState }
POST  /api/units/<id>/consume       { grams?, note?, brew? }
POST  /api/consume/<logId>/undo
```

Consuming a unit and brewing it are one gesture, so `consume` accepts an
optional `brew` object: both records are written together, linked, and **undo
removes both**. When a brew is attached its `notes` is the note — the free-text
`note` on the consume is ignored, so the same sentence is never stored twice.
Logging a brew never blocks consuming, and consuming never requires a brew: the
stock ledger and the brew log are allowed to drift apart.

The response is `{ coffee, logId, brewId }`.

## Alerts, labels, settings, backup

```
GET  /api/alerts                    { portionFreeze[], frozenTooLong[] }
GET  /api/labels/unit/<unitId>.png  one label
GET  /api/labels/export?ids=1,2,3   one id gives a PNG, several give a ZIP
GET  /api/settings
PATCH /api/settings                 thresholds, label size, and the option lists
GET  /api/backup                    whole database as JSON
```

`GET /settings` is the source of truth for the option lists: `methodOptions`,
`grinderOptions`, `filterOptions`, `varietyOptions`, `processOptions`.

The backup payload carries `coffees` (with their active recipe and units) plus
`recipeVersions`, `brews` and `consumptionLog` as their own tables — the history
is not inside the coffee objects.
