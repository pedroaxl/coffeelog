# Handoff: CoffeeLog — Specialty Coffee Management (v1)

## Overview
CoffeeLog is a **self-hosted, personal web app** for managing specialty coffee: cataloging beans, tracking storage units (bags + individual frozen tubes) by weight and state, recording brew recipes, printing QR labels, and scanning them to jump straight to a unit. It is **mobile-first / responsive** (usable on tablet and desktop), intended to be released **open source**. UI language is **English**.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing the intended look, layout, copy, and behavior. They are **not production code to copy directly**. The design is authored as a "Design Component" board (`.dc.html`) using a lightweight runtime for previewing; that runtime is **not** part of the target app.

Your task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries (React, Vue, Svelte, SwiftUI, etc.). If no environment exists yet, choose an appropriate stack for a self-hosted responsive web app (e.g. React + Vite, or SvelteKit) and implement there. Reproduce the visuals faithfully but express them with the codebase's own components, tokens, and conventions.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, copy, and layout are specified. Recreate the UI closely. Exact hex values, fonts, and radii are listed in **Design Tokens** below. Coffee photos are shown as brown gradient placeholders — wire real `<img>` slots there.

---

## Design Language

- **Type**: `Spectral` (serif) for titles/headings and large numbers; `IBM Plex Sans` for all UI/body text. Both from Google Fonts.
- **Aesthetic**: warm, earthy, kitchen-legible. Cream/paper surfaces, espresso-brown ink, terracotta accent, gold for star scores.
- **Corners**: cards ~14–20px radius; phone-scale buttons ~13px; pills/chips fully rounded (20px). Device frame in mocks is cosmetic only.
- **Shadows**: soft, warm, low-opacity (`0 8px 18px -12px rgba(92,61,40,.35)` for cards).
- **Icons**: line icons, ~2px stroke (Lucide/Feather-style is a good match).
- **Emoji**: only country flags in country fields (🇧🇷, 🇨🇴). Otherwise none.

### Unit state → color (used everywhere as a status system)
| State | Dot / accent | Chip bg | Chip text |
|---|---|---|---|
| Open (bag) | `#BE6A3A` | `#F3E6D6` | `#BE6A3A` |
| Frozen | `#5B7B8C` (dot `#6C8CA6`) | `#EAF0F2` | `#5B7B8C` |
| Thawed | `#B07A1C` | `#F7EED8` | `#B07A1C` |
| Consumed | `#A99C8D` | `#F0EBE3` | `#A99C8D` |

---

## Domain Model (data the app tracks)

**Coffee** — one bean/purchase:
- `name`, `roaster`
- `variety`, `process`
- `beanOrigin`: `{ region, country }` — country where the bean was grown
- `roastery`: `{ name, country }` — country where it was roasted
- `altitude` (m), `roastLevel`, `roastDate`, `purchaseDate`
- `tastingNotes: string[]`
- `photo`
- `score`: 1–5 stars — **only assignable after the coffee has been brewed at least once** (a sealed/frozen coffee that's never been extracted has no score yet)
- `recipe` (see below)
- `status`: derived from its units (available / archived)

**StorageUnit** — a coffee has several **at once**. Two kinds:
- **Bag** — the whole package. State: Sealed / Open, and Frozen / Thawed.
- **Tube** — an individual Falcon tube from portioning. Each has its **own weight** (tubes in one batch can differ, e.g. 20 g + 15 g + 15 g). State: Frozen / Thawed / Consumed.
- Each unit: `weightGrams`, `state`, `frozenDate` / `openedDate`, `qrId`.
- Coffee "remaining" = sum of active (non-consumed) unit weights.

**Recipe** — fixed fields + free text:
- Fixed: `method` (enum: V60, Espresso, Aeropress, …), `doseGrams`, `yieldGrams` (water), `ratio` (derived = yield/dose), `waterTempC`, `grinder`, `grinderSetting`.
- Free: `protocol` (multi-line text, markdown ok).

---

## Screens / Views

The board is grouped by feature. Badge ids (e.g. `5a`, `11c`) are how screens are referenced.

### 1. Home (badge 5a) — dark
- **Purpose**: landing; surface pending actions and let the user drill into lists.
- **Layout**: dark espresso background (`#5C3D28`). Top app bar (logo + name, left; scan icon, right). Then two **alert cards** (same structure, distinct colors): "Portion & freeze" (coffees arrived, not yet frozen) and "Frozen for too long" (frozen > threshold). Then **selectable lists** as horizontal chips (Most recent / Longest frozen / Top rated / Recently used) driving a coffee list below. Bottom tab bar: Home · Catalog · Scan · Labels/Settings.
- **Rationale (important)**: there is **no algorithmic "suggestion of the day"** — it was removed as it would just be a random coffee. "Available coffees" is not shown as a raw truncated list; instead the user picks a **named list** (most recent, longest frozen, etc.) because the cellar routinely holds 10+ coffees.

### 2. Catalog (badge 3b)
- **Purpose**: browse/search all coffees.
- **Layout**: cream background. Title + add button. Search field. Filter chips consistent with Home: **default filter shows only Available coffees**, with options to see All / Archived; plus star filters and "longest frozen" / "recent" / "needs portioning".
- **Card (rich horizontal — the chosen style)**: photo thumb (60×74, 12px radius) left; name + state pill (top-right) + roaster + star row; divider; bottom row of tag chips (process / roast / variety) and a **freeze-or-roast date** with a small icon. Card bg `#FFFDF9`, border `#EDE1CF`.

### 3. Coffee detail (badge 3c) — photo-hero
- **Purpose**: everything about one coffee.
- **Layout**: full-bleed photo hero (~270px) with back + edit buttons and name overlaid on a bottom gradient. Below, on cream:
  - **Score card** — big gold stars + "Edit". (Empty/unset before first brew.)
  - **Details** grid (2-col): Variety, Process, Bean origin (region · country, spans 2), Altitude, Roast, Roastery (name · country, spans 2), Roast date, Purchase date.
  - **Tasting notes** — terracotta chips.
  - **Recipe** — dark card (`#2B211A`): top row Method / Dose / Grinder, then protocol text under a divider.
  - **Units · <total g>** — list of units, each: state dot + label + weight.
  - **Portion & freeze** action card (dark) — copy: "Splits the open bag into new tubes — updates existing units."

### 4. Storage units (badge 6a)
- **Purpose**: manage all units of one coffee.
- **Layout**: back header with coffee name. Two summary tiles (remaining g; active unit count). Grouped: **Bag** (one card) and **Falcon tubes** (list). Each unit: icon tile + name + state dot + date + weight. Consumed units summarized in a muted footer line. Bottom actions: **Portion** / **Labels**.

### 5. Print labels — batch (badge 6b)
- **Purpose**: select units → generate QR labels → export PNG (Niimbot phase 1 = PNG only, no direct integration yet).
- **Layout**: back header. **Label preview** card: QR (left) + big weight + coffee name + roaster + a "Frozen <date>" state chip. Selection list with checkboxes (selected = terracotta border + filled check) and state pills; unselectable/unchecked shown lighter. Bottom bar: selected count + **Export PNG**.
- **Label content** (confirmed): QR + individual weight + coffee name + roaster + freeze date.

### 6. Scanner (badge 6c) — dark camera
- **Purpose**: read a label QR → open that unit + recipe.
- **Layout**: dark camera viewport; close + torch controls top; corner-bracket scan frame with animated scan line; hint text. On read, a **result sheet** slides up (cream): "UNIT SCANNED" tag, coffee thumb + name + tube weight + state, quick recipe line (method / dose / grinder), and **Open unit** + a view-recipe button.
- **Note**: "Open unit" (Home shortcut) and the scanner both funnel into the **same flow**; opening a unit *without* scanning is done from the coffee detail's unit list.

### 7. Unit detail (badge 10a)
- **Purpose**: where the scanner lands and where "Consume" starts.
- **Layout**: state banner (colored by unit state) with weight + frozen date + days-in-freezer; label chip; source coffee row (tap → coffee detail); recipe recap; primary **Consume this unit**; secondary **Thaw** / **Label**.

### 8. New coffee wizard (badges 7a → 7b → 7c) — 3 steps
- Step 1 Identification: photo, name, roaster, roastery country.
- Step 2 Source: variety, process, region, country, altitude, roast level, dates.
- Step 3 Initial stock: bag weight + **initial state = Sealed / Open / Frozen** (these exact three options), preview of resulting unit. **No score field** (set later, after first brew).

### 9. Portion & freeze wizard (badges 7d → 7e → 7f) — 3 steps
- Step 1: pick which unit to portion from (frozen tubes are **not** portionable).
- Step 2 **Define tubes**: **manual weight entry per tube** (not "N tubes × fixed weight") — tubes can differ; provide an "Match all to <x> g" shortcut and "Add tube". Choose new tubes' state. Show resulting stock (e.g. open bag 250 g → open 205 g + 3 tubes 20+15+15 frozen).
- Step 3: portioning result + **Generate tube labels** → confirm & print.

### 10. Consume a portion (badges 9a → 9b → 9c)
- 9a: pick the unit to consume from.
- 9b: **from an open bag** — enter grams used (quick chips + Other) → Log consumption; remaining bag weight updates.
- 9c: **a frozen/whole tube** — a tube is a whole portion; consuming removes it entirely; option to thaw (keep) vs consume now (mark consumed).

### 11. Onboarding / empty home (badge 11a) — dark
- Centered: app icon, "Welcome to CoffeeLog", empty-cellar copy, primary **Add your first coffee**, secondary **Scan a label**. Footer: server-connected status line.

### 12. Edit coffee (badge 11b)
- Modal-style form: **Cancel / title / Save** header. Photo + name (focused field style = terracotta 1.5px border), roaster, variety, process (select), bean origin region + country (flag), altitude, roast level (select), editable tasting-note chips with remove (×) and "+ add". Bottom bar: delete (icon) + **Save changes**. **No score field here.**

### 13. Recipe editor (badge 11c)
- **Cancel / "Edit recipe" + coffee name / Save** header.
- **Method**: segmented chips (V60 selected) + overflow "···".
- **Fixed numeric grid** (2-col): Dose (g, focused), Yield/water (g), **Ratio** (read-only derived, muted `#F5EDE1`), Water temp (°C).
- Grinder (text) + Setting (text).
- **Protocol** free-text on the dark card (`#2B211A`) with a caret; "Markdown ok" hint.
- Bottom: **Save recipe**.

### 14. Settings / self-host (badge 11d)
- Grouped list sections on `#F3ECE0`:
  - **Server**: Instance URL, Sync status (green "Connected · 2 min ago").
  - **Label printer**: Device (Niimbot D110), Integration = "Phase 1 · PNG export" (amber chip), Label size (40×30 mm).
  - **Freezer alerts**: warn if not frozen after (3 days), warn if frozen over (40 days), weight unit (grams).
  - **Data**: Export backup (JSON), Version ("CoffeeLog v1.0.0 · open source").
- Bottom tab bar with Settings active.

### 15. Feedback — toasts & confirms (badge 11e)
- **Destructive confirm sheet** (bottom sheet over dimmed screen): icon tile, "Consume this tube?", explanatory body, **Cancel** (neutral) + **Consume** (red `#C0503A`).
- **Toast variants** (each a rounded bar, icon + message + optional action):
  - Success (dark green `#26382C` / `#7FD096`): "Portioned into 3 tubes · labels ready" · action **View**.
  - Warning (dark `#2B211A` / gold `#E7B84B`): "Gesha frozen for 42 days — use soon".
  - Error (`#F5E4DE` bg, `#C0503A`): "Couldn't reach server — changes saved locally" · action **Retry**.
  - Neutral/undo (`#FFFDF9`): "Tube consumed · 20 g removed" · action **Undo**.

### Desktop / wide (badges 8a Catalog, 8b Detail)
- Fixed left sidebar (nav) + content. Catalog = responsive card grid using the width. Detail = two columns: left = photo + details + recipe; right = score + units panel. Same tokens as mobile.

---

## Interactions & Behavior
- **Navigation**: bottom tab bar (Home / Catalog / Scan / Settings) on mobile; sidebar on desktop. Cards and list rows are tappable → detail. Back chevrons return.
- **Wizards** (new coffee, portion): 3 steps with a progress indicator ("1 of 3"), Continue/Confirm advancing, back to retreat.
- **Score**: editable only after first brew; before that, show an empty/unset state.
- **Portioning** mutates existing units (bag weight decreases; new tubes created) — must be transactional.
- **Consuming**: bag = subtract grams (bag stays); tube = remove whole unit (mark consumed), undoable from history.
- **Scanner**: camera → detect QR → resolve `qrId` → slide result sheet → Open unit. Handle no-permission / not-found gracefully (see toasts).
- **Labels**: multi-select → Export PNG. (Phase 2 will add direct Niimbot printing.)
- **Sync**: optimistic local writes; if server unreachable, save locally and surface the error toast with Retry.
- **Transitions**: keep subtle — sheets slide up, toasts fade/slide from bottom; ~200–300ms ease-out.

## State Management
- `coffees[]` with nested `units[]` and `recipe`.
- Derived: per-coffee remaining weight, active unit count, status (available/archived), alert queues (needs-freezing, frozen-too-long) computed from unit states + dates against Settings thresholds.
- UI state: active tab, selected filter/list, wizard step + draft, label-selection set, toast queue, confirm-dialog target.
- Settings: instance URL, sync status, printer config, alert thresholds, weight unit.
- Data fetching: talks to the self-hosted server; offline-tolerant with local cache.

## Design Tokens

**Colors**
```
Ink / espresso title    #2B211A
Brown (brand/dark bg)   #5C3D28
Terracotta accent       #BE6A3A
Accent deep (links)     #9A5228
Gold (stars)            #C79A33   bright gold #E7B84B
Page bg (warm)          #EDE3D4  (radial to #F5EDE1 / #EBE0D0)
Surface cream           #FBF6EE
Card surface            #FFFDF9
Card border             #EDE1CF / #E4D8C6 / #EADFCD
Muted tan fill          #F1E7D8 / #F5EDE1 / #F3ECE0
Secondary text          #8A7867   tertiary #B5A48F
Chip terracotta bg      #F3E6D6   text #9A5228
Destructive red         #C0503A   bg #F5E4DE
Success green           #3E8E5B / toast #26382C + #7FD096
State: frozen #5B7B8C (dot #6C8CA6) · thawed #B07A1C · consumed #A99C8D
Device bezel            #241A13
```

**Typography**
```
Titles / numbers   Spectral, 600, e.g. 30px (app title), 26px (screen), 18–20px (section)
Body / UI          IBM Plex Sans, 400/500/600
Labels             12px #8A7867; UPPERCASE section labels 11.5px, 600, letter-spacing .6px
Field value        14px; large numeric 15–23px
```

**Radius**: cards 14–20px · buttons 13px · inputs 12px · chips/pills 20px · icon tiles 10–11px.

**Shadow**: cards `0 8px 18px -12px rgba(92,61,40,.35)`; floating/sheets `0 -10px 40px -12px rgba(0,0,0,.4)`; device `0 40px 80px -30px rgba(40,25,15,.55)` (cosmetic).

**Spacing**: screen padding 22px; card padding 12–16px; gaps 8–13px; section spacing 18–22px.

## Assets
- **Fonts**: Google Fonts `Spectral` + `IBM Plex Sans`.
- **Logo/icon**: coffee-bean mark — a cream ellipse rotated −32° with a terracotta center crease stroke, on a rounded terracotta tile (`#BE6A3A`). SVG is inline in the HTML (search `viewBox="0 0 48 48"`); lift it directly.
- **Icons**: line icons, 2px stroke — use Lucide/Feather equivalents.
- **QR**: rendered as SVG mock in the label preview; use a real QR library (encode `qrId`).
- **Coffee photos**: brown gradient placeholders → replace with real image slots.
- **Flags**: emoji in country fields.

## Files
- `CoffeeLog.dc.html` — the full design board (English, current). All screens above live here; find a screen by its badge id (e.g. `id="11c"`).
- `CoffeeLog (PT-BR).dc.html` — earlier Portuguese version, kept for history only. **Do not implement from this**; English is canonical.

Both are design references, not runnable app code. Recreate them in the target environment.
