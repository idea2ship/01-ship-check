#!/usr/bin/env bash
# /1> Ship Check — production deploy script.
#
# Run on the OCI VM after setup.sh has been run once.
#   ssh ubuntu@your-oci-ip
#   cd ~/01-ship-check
#   bash deploy/deploy.sh
#
# Or from your laptop in one line:
#   ssh ubuntu@your-oci-ip 'cd ~/01-ship-check && bash deploy/deploy.sh'

set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ /1> Ship Check — deploy"
START_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "  current: $START_SHA"

# ────────────────────────────────────────────────────────────────────────
# 1. Pull latest
# ────────────────────────────────────────────────────────────────────────
echo "→ git pull..."
git fetch --quiet origin main
git reset --hard origin/main

END_SHA=$(git rev-parse --short HEAD)
if [[ "$START_SHA" == "$END_SHA" ]]; then
  echo "  already at $END_SHA, no changes"
else
  echo "  $START_SHA → $END_SHA"
fi

# ────────────────────────────────────────────────────────────────────────
# 2. Install deps (only if pnpm-lock.yaml changed)
# ────────────────────────────────────────────────────────────────────────
if git diff --name-only "$START_SHA" "$END_SHA" 2>/dev/null | grep -q pnpm-lock.yaml; then
  echo "→ Lockfile changed — pnpm install..."
  pnpm install --frozen-lockfile
else
  echo "→ Lockfile unchanged, skipping install"
fi

# ────────────────────────────────────────────────────────────────────────
# 3. Build
# ────────────────────────────────────────────────────────────────────────
echo "→ Building..."
pnpm build

# ────────────────────────────────────────────────────────────────────────
# 4. Restart systemd service
# ────────────────────────────────────────────────────────────────────────
echo "→ Restarting ship-check service..."
sudo systemctl restart ship-check

# Give it a moment, then verify
sleep 3
if systemctl is-active --quiet ship-check; then
  echo "  ✓ ship-check is active"
else
  echo "  ✗ ship-check failed to start. Recent logs:"
  sudo journalctl -u ship-check -n 30 --no-pager
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────
# 5. Smoke test
# ────────────────────────────────────────────────────────────────────────
echo "→ Smoke test..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || echo "000")
if [[ "$HTTP" == "200" ]]; then
  echo "  ✓ HTTP 200 from localhost:3000"
else
  echo "  ⚠ HTTP $HTTP (check journalctl -u ship-check)"
fi

echo ""
echo "✓ Deploy complete: $END_SHA"
