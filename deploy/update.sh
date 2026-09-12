#!/usr/bin/env bash
# Update a native (Option A) CoffeeLog install: pull, rebuild, restart.
# Run from the repo root, e.g. /opt/coffeelog.
set -euo pipefail

cd "$(dirname "$0")/.."

# A release may migrate the database on its first start. Snapshot it first, so
# rolling back is copying one file back. Set DATA_DIR if yours is elsewhere.
DATA_DIR="${DATA_DIR:-$PWD/data}"
DB="$DATA_DIR/coffeelog.db"
if [ -f "$DB" ]; then
  BACKUP="$DB.backup-$(date +%Y%m%d-%H%M%S)"
  echo "==> Backing up $DB -> $BACKUP"
  # .backup copies a consistent snapshot even while the service is running;
  # fall back to cp when the sqlite3 CLI isn't installed.
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB" ".backup '$BACKUP'"
  else
    cp -p "$DB" "$BACKUP"
  fi
fi

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing dependencies"
npm install

echo "==> Building"
npm run build

echo "==> Restarting service"
if systemctl is-enabled --quiet coffeelog 2>/dev/null; then
  systemctl restart coffeelog
  systemctl --no-pager status coffeelog | head -n 5
else
  echo "coffeelog.service not installed; start it manually or copy deploy/coffeelog.service."
fi

echo "==> Done"
