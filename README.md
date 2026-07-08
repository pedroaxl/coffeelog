# CoffeeLog

A self-hosted, single-user web app to catalog specialty coffee, track storage
units (a bag plus individual frozen Falcon tubes) by weight and state, keep a
semi-structured brew recipe per coffee, and generate QR labels for a
**Niimbot B1** printer. Mobile-first and responsive — usable from phone, tablet
and desktop over your local network.

> UI, code and docs are in English (this is published open source). Your own
> data — coffee names, roaster names, tasting notes, recipe protocols — stays in
> whatever language you type.

## Features (v1)

- **Coffee catalog** — CRUD with photo, structured origin/roastery, tasting
  notes, a 1–5 **score** (editable anytime), and a semi-structured **recipe**
  (method · dose · yield · ratio · temp · grinder + free-text protocol).
- **Storage units** — each coffee can hold several units at once: a **Bag**
  (Sealed/Open × Frozen/Defrosted) and any number of **Falcon tubes** (each with
  its own weight; Frozen/Defrosted/Consumed). **Portion & freeze** splits an open
  bag into per-weight tubes in one transaction; **consume** subtracts grams from
  a bag or removes a whole tube, with **undo** and an optional tasting note.
- **QR labels** — generate a PNG per unit (QR + weight + coffee name + roaster +
  freeze date) at a configurable size; export one as PNG or several as a ZIP,
  then import into the Niimbot app. The QR encodes a URL so a phone camera opens
  the unit directly; an in-app **scanner** does the same.
- **Home alerts** — "Portion & freeze" and "Frozen for too long" cards driven by
  editable thresholds in **Settings**.

## Stack

- **Backend** — Node + Express + `better-sqlite3` (a single SQLite file),
  TypeScript. Renders label PNGs with `@napi-rs/canvas` + `qrcode` (bundled
  fonts, no system dependencies).
- **Frontend** — React + Vite + TypeScript, Tailwind v4, TanStack Query,
  self-hosted fonts (works offline on a LAN).
- Shipped as **one Docker image** that serves the built SPA and the `/api`.

## Run it

### With Docker (recommended for your server)

```bash
docker compose up -d --build
```

Then open `http://<server-ip>:8080`. Data (the SQLite DB + uploaded photos)
lives in the `coffeelog-data` volume — back up CoffeeLog by copying that volume.

Set your LAN address in **Settings → Instance URL** (e.g. `192.168.0.12:8080`)
so the QR labels encode a URL your phone camera can open.

### Local development

```bash
npm install
npm run dev        # web on :5173 (proxying /api), server on :8080
```

Open `http://localhost:5173`. In dev the server writes its data to `./data` in
the repo root.

> **Note:** `npm run dev:server` runs from the `server/` workspace, so a
> relative `DATA_DIR` resolves against `server/`. Prefer an **absolute**
> `DATA_DIR` if you set it by hand. In Docker it is the absolute `/data`.

### Useful scripts

```bash
npm test         # server + web test suites (Vitest)
npm run typecheck
npm run build    # build web then server
```

## Deployment target

Designed to run on a home server (e.g. a Proxmox LXC container running Docker).
Single user, no authentication in v1 — keep it on your trusted local network.

## Data & backup

Everything is one SQLite file plus a photos directory under the data dir. Snapshot
that directory (or the Docker volume), or use **Settings → Export backup (JSON)**
for a portable dump.

## Not in v1 (backlog)

Full recipe engine/versioning, brew logs, automatic resting-window indicator, a
structured equipment catalog, photo autofill, NFC, consumption stats, and a
guided brew-assistant timer.

## License

MIT — see [LICENSE](LICENSE). Bundled fonts are under the SIL Open Font License.
