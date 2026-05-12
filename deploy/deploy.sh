#!/usr/bin/env bash
# /1> Ship Check — production deploy via Docker Compose.
#
# Actual prod runs as a Docker container behind the shared `infra-caddy`
# reverse proxy on the `frontdoor-net` network (see
# /srv/infra/compose/idea2ship/01-ship-check/docker-compose.yml).
#
# Usage (from anywhere on the VM):
#   bash /srv/web/idea2ship/01-ship-check/deploy/deploy.sh
#
# Flow:
#   1. Refuse if the working tree is dirty (build context = working tree,
#      so uncommitted edits would ship — and `git pull` would drop them).
#   2. Fast-forward pull from origin/main.
#   3. `docker compose up -d --build` rebuilds the image and restarts only
#      if the image hash changed.
#   4. Wait for container healthcheck, then HTTP smoke test through Caddy.

set -euo pipefail

APP_DIR="/srv/web/idea2ship/01-ship-check"
COMPOSE_DIR="/srv/infra/compose/idea2ship/01-ship-check"
CONTAINER="ship-check-web"
PUBLIC_HOST="01.idea2ship.xyz"

cd "$APP_DIR"

echo "→ /1> Ship Check — deploy"
START_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "  current: $START_SHA"

# ────────────────────────────────────────────────────────────────────────
# 1. Pre-flight — refuse to deploy a dirty tree
# ────────────────────────────────────────────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo ""
  echo "✗ Uncommitted changes in working tree. Commit/stash first —"
  echo "  the docker build context IS the working tree, so uncommitted"
  echo "  edits would silently ship, and the git pull below would refuse"
  echo "  or clobber them."
  echo ""
  git status --short
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────
# 2. Pull latest (fast-forward only)
# ────────────────────────────────────────────────────────────────────────
echo "→ git pull..."
git fetch --quiet origin main
git merge --ff-only origin/main

END_SHA=$(git rev-parse --short HEAD)
if [[ "$START_SHA" == "$END_SHA" ]]; then
  echo "  already at $END_SHA — rebuilding anyway (in case Dockerfile deps changed)"
else
  echo "  $START_SHA → $END_SHA"
fi

# ────────────────────────────────────────────────────────────────────────
# 3. Build + restart
# ────────────────────────────────────────────────────────────────────────
echo "→ docker compose build + up..."
cd "$COMPOSE_DIR"
docker compose up -d --build

# ────────────────────────────────────────────────────────────────────────
# 4. Wait for healthcheck (compose healthcheck: 30s start_period + retries)
# ────────────────────────────────────────────────────────────────────────
echo "→ Waiting for healthcheck..."
STATUS="starting"
for _ in {1..30}; do
  STATUS=$(docker inspect "$CONTAINER" --format '{{.State.Health.Status}}' 2>/dev/null || echo "missing")
  [[ "$STATUS" == "healthy" ]] && break
  sleep 2
done

if [[ "$STATUS" != "healthy" ]]; then
  echo "  ✗ container is '$STATUS' — last 40 lines of logs:"
  docker logs --tail 40 "$CONTAINER"
  exit 1
fi
echo "  ✓ $CONTAINER healthy"

# ────────────────────────────────────────────────────────────────────────
# 5. Smoke test through Caddy (forces public hostname so Caddy routes it)
# ────────────────────────────────────────────────────────────────────────
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" -H "Host: $PUBLIC_HOST" https://127.0.0.1 || echo "000")
if [[ "$HTTP" == "200" ]]; then
  echo "  ✓ HTTPS 200 via Caddy ($PUBLIC_HOST)"
else
  echo "  ⚠ HTTPS $HTTP via Caddy (check: docker logs infra-caddy)"
fi

echo ""
echo "✓ Deploy complete: $END_SHA"
