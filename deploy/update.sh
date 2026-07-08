#!/usr/bin/env bash
# Update a native (Option A) CoffeeLog install: pull, rebuild, restart.
# Run from the repo root, e.g. /opt/coffeelog.
set -euo pipefail

cd "$(dirname "$0")/.."

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
