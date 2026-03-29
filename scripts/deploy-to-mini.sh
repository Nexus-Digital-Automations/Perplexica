#!/bin/bash
# Deploy Perplexica to M1 Mac Mini
# Run from the MacBook: bash scripts/deploy-to-mini.sh
set -euo pipefail

MINI_USER="nexusadmin"
MINI_HOST="192.168.50.173"
MINI_SSH="${MINI_USER}@${MINI_HOST}"
REMOTE_DIR="/Users/${MINI_USER}/perplexica"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Deploying Perplexica to ${MINI_SSH} ==="
echo "  Source: ${PROJECT_DIR}"
echo "  Target: ${REMOTE_DIR}"
echo ""

# Step 1: Create remote directory
echo "[1/7] Creating remote directory..."
ssh "${MINI_SSH}" "mkdir -p ${REMOTE_DIR}/data"

# Step 2: Sync codebase (exclude dev artifacts, node_modules, .git)
echo "[2/7] Syncing codebase via rsync..."
rsync -azP --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.worktrees' \
  --exclude='.searxng' \
  --exclude='.claude' \
  --exclude='.playwright-mcp' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='output' \
  --exclude='logs' \
  --exclude='data/db.sqlite*' \
  --exclude='data/uploads' \
  "${PROJECT_DIR}/" "${MINI_SSH}:${REMOTE_DIR}/"

# Step 3: Copy config (has API keys)
echo "[3/7] Copying config..."
scp "${PROJECT_DIR}/data/config.json" "${MINI_SSH}:${REMOTE_DIR}/data/config.json"

# Step 4: Install dependencies on Mini
echo "[4/7] Installing dependencies on Mini..."
ssh "${MINI_SSH}" "cd ${REMOTE_DIR} && yarn install --frozen-lockfile 2>&1 || yarn install"

# Step 5: Build
echo "[5/7] Building production bundle..."
ssh "${MINI_SSH}" "cd ${REMOTE_DIR} && NODE_OPTIONS='--max-old-space-size=3072' yarn build"

# Step 6: Start SearXNG via Docker
echo "[6/7] Starting SearXNG..."
ssh "${MINI_SSH}" "cd ${REMOTE_DIR} && docker compose -f docker-compose.search.yaml up -d 2>/dev/null || echo 'SearXNG already running or docker-compose.search.yaml not found'"

# Step 7: Install pm2 and start app
echo "[7/7] Starting Perplexica with pm2..."
ssh "${MINI_SSH}" "
  npm install -g pm2 2>/dev/null
  cd ${REMOTE_DIR}
  pm2 delete perplexica 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup 2>/dev/null || true
"

echo ""
echo "=== Deployment complete! ==="
echo "  App: http://${MINI_HOST}:3000"
echo "  Logs: ssh ${MINI_SSH} 'pm2 logs perplexica'"
echo "  Status: ssh ${MINI_SSH} 'pm2 status'"
