#!/usr/bin/env bash
# /1> Ship Check — first-time setup script for OCI Ampere VM (Ubuntu 22.04+).
#
# Run ONCE on a fresh VM (or any time you need to re-bootstrap). Idempotent
# where reasonable. Re-running won't hurt but won't fix a broken state either.
#
#   ssh ubuntu@your-oci-ip
#   git clone git@github-idea2ship:idea2ship/01-ship-check.git
#   cd 01-ship-check
#   bash deploy/setup.sh

set -euo pipefail

APP_DIR="$HOME/01-ship-check"
NODE_VERSION="22"
DOMAIN="01.idea2ship.xyz"

echo "→ /1> Ship Check — initial OCI setup"
echo "  VM:     $(uname -a)"
echo "  User:   $(whoami)"
echo "  Home:   $HOME"
echo ""

cd "$APP_DIR" || {
  echo "✗ $APP_DIR not found. Clone the repo first:"
  echo "  git clone git@github-idea2ship:idea2ship/01-ship-check.git ~/01-ship-check"
  exit 1
}

# ────────────────────────────────────────────────────────────────────────
# 1. System deps
# ────────────────────────────────────────────────────────────────────────
echo "→ Installing system packages..."
sudo apt update
sudo apt install -y curl git build-essential debian-keyring debian-archive-keyring apt-transport-https

# ────────────────────────────────────────────────────────────────────────
# 2. Node via nvm (cleaner than apt — easier to upgrade)
# ────────────────────────────────────────────────────────────────────────
if [[ ! -d "$HOME/.nvm" ]]; then
  echo "→ Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi

# Load nvm into this shell
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  echo "→ Installing Node $NODE_VERSION..."
  nvm install "$NODE_VERSION"
  nvm alias default "$NODE_VERSION"
fi

echo "  node: $(node -v)"

# ────────────────────────────────────────────────────────────────────────
# 3. pnpm
# ────────────────────────────────────────────────────────────────────────
if ! command -v pnpm >/dev/null 2>&1; then
  echo "→ Installing pnpm..."
  npm install -g pnpm
fi
echo "  pnpm: $(pnpm -v)"

# ────────────────────────────────────────────────────────────────────────
# 4. App dependencies + first build
# ────────────────────────────────────────────────────────────────────────
echo "→ Installing app dependencies..."
pnpm install --frozen-lockfile

if [[ ! -f .env.local ]]; then
  echo ""
  echo "⚠️  .env.local NOT found. Create it before continuing:"
  echo ""
  echo "  cp .env.example .env.local"
  echo "  nano .env.local   # fill in GROQ_API_KEY, SUPABASE_*, CF_*"
  echo ""
  echo "Then re-run: bash deploy/setup.sh"
  exit 1
fi
chmod 600 .env.local
echo "  .env.local exists (chmod 600)"

echo "→ Building..."
pnpm build

# ────────────────────────────────────────────────────────────────────────
# 5. systemd unit
# ────────────────────────────────────────────────────────────────────────
echo "→ Installing systemd unit..."

# Resolve the actual Node binary path for the unit file
NODE_BIN_DIR=$(dirname "$(which node)")
TMP_UNIT=$(mktemp)
sed "s|/home/ubuntu/.nvm/versions/node/v22.15.0/bin|$NODE_BIN_DIR|g" \
    deploy/ship-check.service \
  | sed "s|/home/ubuntu/01-ship-check|$APP_DIR|g" \
  | sed "s|User=ubuntu|User=$(whoami)|g" \
  | sed "s|Group=ubuntu|Group=$(whoami)|g" \
  > "$TMP_UNIT"

sudo install -m 644 "$TMP_UNIT" /etc/systemd/system/ship-check.service
rm "$TMP_UNIT"

sudo systemctl daemon-reload
sudo systemctl enable ship-check
sudo systemctl restart ship-check

sleep 2
if systemctl is-active --quiet ship-check; then
  echo "  ✓ ship-check running on port 3000"
else
  echo "  ✗ ship-check failed to start. Check: sudo journalctl -u ship-check -n 50"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────
# 6. Caddy (reverse proxy + automatic TLS)
# ────────────────────────────────────────────────────────────────────────
if ! command -v caddy >/dev/null 2>&1; then
  echo "→ Installing Caddy..."
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update
  sudo apt install -y caddy
fi
echo "  caddy: $(caddy version | head -1)"

echo "→ Installing Caddyfile..."
sudo install -m 644 deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy

# ────────────────────────────────────────────────────────────────────────
# 7. Firewall (Oracle's iptables — keeps existing rules, adds 80/443)
# ────────────────────────────────────────────────────────────────────────
echo "→ Opening ports 80/443..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save 2>/dev/null || true
fi

# ────────────────────────────────────────────────────────────────────────
# Done
# ────────────────────────────────────────────────────────────────────────
echo ""
echo "✓ Setup complete."
echo ""
echo "Next steps:"
echo "  1. Point DNS for $DOMAIN to this VM's public IP."
echo "     (Cloudflare DNS or your registrar — A record, proxy OFF for cert issuance)"
echo "  2. Wait ~30s for Caddy to obtain Let's Encrypt cert."
echo "  3. Visit https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status ship-check"
echo "  sudo journalctl -u ship-check -f"
echo "  sudo journalctl -u caddy -f"
echo ""
echo "To deploy a new version:  bash deploy/deploy.sh"
