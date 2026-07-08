# Deploying CoffeeLog

CoffeeLog is a single Node process serving a built SPA and a JSON API, backed by
one SQLite file. That makes it easy to run either as a native service or as a
Docker container. Below are the paths for a home server (e.g. Proxmox) plus how
to run it locally for testing.

> **Ports:** in **production there is only one port** (`8080`). The same process
> serves the web app *and* the `/api`. The two-port split (web on `5173`, API on
> `8080`) exists **only in development** with `npm run dev` — you do not expose
> `5173` on your server. Production serving depends on `npm run build` having
> produced `web/dist` first (the server logs which web directory it serves, or a
> warning if none is found).

---

## Run locally (testing & debugging)

```bash
npm install
npm run dev
```

Starts the Vite dev server on **:5173** (hot reload) and the Express API on
**:8080**. Open <http://localhost:5173> — the web app proxies `/api` and
`/uploads` to the backend.

Handy commands:

```bash
npm test          # server + web test suites (Vitest)
npm run typecheck # TypeScript across both workspaces
npm run build     # production bundle
```

- Dev data (SQLite DB + uploaded photos) lives in `./data` at the repo root.
  Wipe it with `rm -rf ./data`.
- **Gotcha:** `npm run dev:server` runs from the `server/` workspace, so a
  *relative* `DATA_DIR` set by hand resolves against `server/`, not the repo
  root. Leave it unset in dev, or pass an **absolute** path.

Smoke-test the real production artifact locally (one process, like production):

```bash
npm run build
DATA_DIR=$PWD/data PORT=8080 npm run start   # http://localhost:8080
```

---

## Proxmox — Option A: LXC + native Node (recommended, lightest)

No Docker layer; the app is just Node + a SQLite file.

1. **Create an LXC** in Proxmox: Debian 12 or Ubuntu, ~1 vCPU / 512 MB–1 GB RAM
   / 4 GB disk. Give it a static IP (or a DHCP reservation).
2. **Install Node 20+ and git** inside the container:
   ```bash
   apt update && apt install -y git curl
   curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
   apt install -y nodejs
   ```
3. **Clone and build:**
   ```bash
   git clone <your-repo-url> /opt/coffeelog
   cd /opt/coffeelog
   npm install
   npm run build
   ```
4. **Install the service** (unit file in [`deploy/coffeelog.service`](../deploy/coffeelog.service)):
   ```bash
   cp deploy/coffeelog.service /etc/systemd/system/coffeelog.service
   # edit WorkingDirectory / DATA_DIR if you cloned somewhere other than /opt/coffeelog
   systemctl daemon-reload
   systemctl enable --now coffeelog
   systemctl status coffeelog     # verify
   journalctl -u coffeelog -f     # live logs
   ```
5. Open **http://\<container-ip\>:8080**.

**Update later:**

```bash
cd /opt/coffeelog && ./deploy/update.sh
```

---

## Proxmox — Option B: LXC/VM + Docker

Uses the repo's [`Dockerfile`](../Dockerfile) and [`docker-compose.yml`](../docker-compose.yml).

1. For an **unprivileged LXC**, enable Docker support first: add
   `features: nesting=1,keyctl=1` to `/etc/pve/lxc/<id>.conf` and reboot the
   container. (A full VM needs nothing special.)
2. Install Docker, then:
   ```bash
   git clone <your-repo-url> /opt/coffeelog && cd /opt/coffeelog
   docker compose up -d --build
   ```
3. Open **http://\<host-ip\>:8080**. Data persists in the `coffeelog-data`
   Docker volume.

**Update later:** `git pull && docker compose up -d --build`.

---

## After it's up

- **Set the instance URL:** Settings → Instance URL (e.g. `192.168.0.50:8080`).
  QR labels encode this, so scanning a printed label with a phone camera opens
  that unit directly.
- **Backups:** everything is one directory — the SQLite DB + `uploads/`.
  - Option A: back up `/opt/coffeelog/data`.
  - Option B: back up the `coffeelog-data` Docker volume.
  - Or Settings → **Export backup (JSON)** for a portable dump.
  - A periodic Proxmox snapshot of the container also covers it.
- **Scanner note:** the in-app camera scanner needs a secure context. Over plain
  `http://<ip>` most browsers block camera access and the scanner falls back to
  manual code entry — but your **phone's native camera** opening the label URL
  works regardless. For the in-app camera on the LAN, front it with HTTPS (e.g. a
  Caddy reverse proxy) later.

---

## Troubleshooting

- **`Cannot GET /` at the root (API works, site doesn't):** the server didn't find
  the built web app. Make sure you ran `npm run build` (it produces `web/dist`),
  then restart. The startup logs print either `Serving web app from: …` or a
  warning that no build was found. There is only one port to open (`8080`) — you
  do **not** need to expose `5173` in production; that's dev-only.
- **QR opens the wrong address:** set **Settings → Instance URL** to how you reach
  the server on your LAN (e.g. `192.168.0.50:8080`). Labels printed afterwards
  encode that address; re-export any labels you generated before setting it.
