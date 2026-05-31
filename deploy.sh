#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== [1/5] update source ==="
cd "$PROJECT_DIR"
git pull origin main

echo "=== [2/5] install dependencies ==="
npm ci --omit=dev

echo "=== [3/5] build Nuxt ==="
npm run build

echo "=== [4/5] restart PM2 ==="
pm2 describe CMS-api >/dev/null 2>&1 \
  && pm2 restart CMS-api --update-env \
  || pm2 start "$PROJECT_DIR/api-server/index.mjs" --name CMS-api --cwd "$PROJECT_DIR" --update-env

pm2 describe CMS-client >/dev/null 2>&1 \
  && pm2 restart CMS-client --update-env \
  || PORT=9001 pm2 start "$PROJECT_DIR/.output/server/index.mjs" --name CMS-client --cwd "$PROJECT_DIR" --update-env

echo "=== [5/5] save PM2 ==="
pm2 save
pm2 list