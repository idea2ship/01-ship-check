#!/usr/bin/env bash
# Cloudflare Workers AI usage check.
#
# Reads CF_ACCOUNT_ID and CF_ANALYTICS_TOKEN from .env.local (the analytics
# token is separate from CF_API_TOKEN — needs "Account Analytics: Read").
#
# Usage:
#   ./scripts/cf-usage.sh            # today's neurons
#   ./scripts/cf-usage.sh 7          # last 7 days
#   ./scripts/cf-usage.sh 30         # last 30 days

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "✗ .env.local not found"
  exit 1
fi

# Load env vars without exporting comments/blank lines
ACCOUNT_ID=$(grep -E '^CF_ACCOUNT_ID=' .env.local | head -1 | cut -d= -f2- | tr -d '"')
TOKEN=$(grep -E '^CF_ANALYTICS_TOKEN=' .env.local | head -1 | cut -d= -f2- | tr -d '"')

if [[ -z "${ACCOUNT_ID:-}" ]]; then
  echo "✗ CF_ACCOUNT_ID missing in .env.local"
  exit 1
fi

if [[ -z "${TOKEN:-}" ]]; then
  echo "✗ CF_ANALYTICS_TOKEN missing in .env.local"
  echo ""
  echo "  Create one at:"
  echo "    dash.cloudflare.com → My Profile → API Tokens → Create Token"
  echo "    Permission: Account → Account Analytics → Read"
  echo "  Then add to .env.local:"
  echo "    CF_ANALYTICS_TOKEN=..."
  exit 1
fi

DAYS="${1:-1}"
SINCE=$(date -u -v-"${DAYS}"d '+%Y-%m-%dT00:00:00Z' 2>/dev/null \
  || date -u -d "${DAYS} days ago" '+%Y-%m-%dT00:00:00Z')

read -r -d '' QUERY <<EOF || true
{
  "query": "query AiUsage(\$accountTag: string!, \$since: Time!) { viewer { accounts(filter: {accountTag: \$accountTag}) { workersAiInferenceAdaptiveGroups(limit: 1000, filter: {datetime_geq: \$since}) { sum { neurons requests } dimensions { modelName } } } } }",
  "variables": {
    "accountTag": "$ACCOUNT_ID",
    "since": "$SINCE"
  }
}
EOF

echo "→ Checking usage since $SINCE..."
echo ""

curl -sS "https://api.cloudflare.com/client/v4/graphql" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw "$QUERY" \
| python3 -c '
import json, sys
data = json.load(sys.stdin)
if data.get("errors"):
    print("✗ GraphQL errors:")
    for e in data["errors"]:
        print("  -", e.get("message"))
    sys.exit(1)
groups = (data.get("data", {})
              .get("viewer", {})
              .get("accounts", [{}])[0]
              .get("workersAiInferenceAdaptiveGroups", []))
if not groups:
    print("(no Workers AI activity in this window)")
    sys.exit(0)

total_n = 0
total_r = 0
print(f"{\"Model\":<50} {\"Requests\":>10} {\"Neurons\":>10}")
print("-" * 72)
for g in groups:
    name = g.get("dimensions", {}).get("modelName", "?")
    n = g.get("sum", {}).get("neurons", 0)
    r = g.get("sum", {}).get("requests", 0)
    total_n += n
    total_r += r
    print(f"{name:<50} {r:>10} {n:>10}")
print("-" * 72)
print(f"{\"Total\":<50} {total_r:>10} {total_n:>10}")
print()
free_quota = 10_000
used_pct = (total_n / free_quota) * 100 if free_quota else 0
print(f"Free tier: {total_n:,} / {free_quota:,} neurons/day ({used_pct:.1f}%)")
remaining_images = max(0, (free_quota - total_n) // 83)
print(f"≈ {remaining_images} more flux-schnell images today before hitting paid tier")
'
