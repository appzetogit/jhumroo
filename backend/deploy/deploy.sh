#!/bin/bash
# Jhumroo deploy. The VPS is shared with other projects: this touches ONLY the jhumroo-* PM2 apps
# (backend/ecosystem.config.cjs) and /var/www/jhumroo. Never pm2 restart/delete all.
#   bash /root/jhumroo/backend/deploy/deploy.sh
set -euo pipefail

ROOT=/root/jhumroo
WEB=/var/www/jhumroo

echo "🚀 Deploying Jhumroo..."
cd "$ROOT"
git pull --ff-only origin main

# ---------- Frontend: build first, then swap into place (site is never empty mid-deploy) ----------
echo "⚛️  Building frontend..."
cd "$ROOT/frontend"
npm ci --no-audit --no-fund
npm run build
rm -rf "$WEB.new" "$WEB.old"
cp -r dist "$WEB.new"
[ -d "$WEB" ] && mv "$WEB" "$WEB.old"
mv "$WEB.new" "$WEB"
rm -rf "$WEB.old"

# ---------- Backend ----------
echo "🖥️  Installing backend packages..."
cd "$ROOT/backend"
# backend/package-lock.json is not in git, so `npm ci` would break on the first new dependency.
npm install --omit=dev --no-audit --no-fund

# Syntax-check our code BEFORE touching the running processes: a typo must not take the API down.
echo "🔎 Checking backend code..."
find . -name "*.js" -not -path "./node_modules/*" -print0 | xargs -0 -n1 node --check

# The pre-cluster single process, in case it was ever started again (exact name, nothing else).
pm2 describe jhumroo > /dev/null 2>&1 && pm2 delete jhumroo

echo "🔄 Reloading jhumroo-api / jhumroo-socket / jhumroo-worker..."
if pm2 describe jhumroo-api > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env   # api: one instance at a time, no downtime
else
  pm2 start ecosystem.config.cjs
fi

# ---------- Health check ----------
sleep 8
if ! curl -fsS -o /dev/null http://127.0.0.1:5007/api/reels/feed; then
  echo "❌ API health check failed"; pm2 logs jhumroo-api --lines 40 --nostream; exit 1
fi
if ! curl -fsS "http://127.0.0.1:5008/socket.io/?EIO=4&transport=polling" | grep -q '"sid"'; then
  echo "❌ Socket health check failed"; pm2 logs jhumroo-socket --lines 40 --nostream; exit 1
fi

pm2 save
echo "✅ Deployment successful!"
