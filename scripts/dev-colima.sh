#!/usr/bin/env bash
set -euo pipefail

PORTS=(3000 4000)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_SEARCH=(docker compose -f "$PROJECT_DIR/docker-compose.search.yaml")
COLIMA_PROFILE="perplexica"

# 1. Ensure Colima installed
if ! command -v colima &>/dev/null; then
  echo "Installing Colima..."
  brew install colima docker docker-compose
fi

# 2. Start Colima with memory cap (idempotent)
if colima status --profile "$COLIMA_PROFILE" 2>/dev/null | grep -q "Running"; then
  echo "Colima ($COLIMA_PROFILE) already running."
else
  echo "Starting Colima (2 CPU / 2 GB RAM)..."
  colima start --profile "$COLIMA_PROFILE" --cpu 2 --memory 2 --disk 20 \
    --vm-type vz --vz-rosetta 2>/dev/null || \
  colima start --profile "$COLIMA_PROFILE" --cpu 2 --memory 2 --disk 20
fi

export DOCKER_HOST="unix://$HOME/.colima/$COLIMA_PROFILE/docker.sock"

# 3. Clear ports
echo "Clearing ports ${PORTS[*]}..."
for port in "${PORTS[@]}"; do
  cids=$(docker ps -q --filter "publish=$port" 2>/dev/null || true)
  [ -n "$cids" ] && echo "$cids" | xargs docker stop 2>/dev/null || true
done
"${COMPOSE_SEARCH[@]}" down --remove-orphans 2>/dev/null || true
pkill -f "mcp-server/index.ts" 2>/dev/null || true
for port in "${PORTS[@]}"; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null || true
done

# 4. Start SearXNG in Colima container
echo "Starting SearXNG (Colima)..."
DOCKER_HOST="$DOCKER_HOST" "${COMPOSE_SEARCH[@]}" up -d

echo -n "Waiting for SearXNG"
for i in $(seq 1 30); do
  curl -sf "http://localhost:4000/" >/dev/null 2>&1 && { echo " ready."; break; }
  sleep 1; echo -n "."
done
curl -sf "http://localhost:4000/" >/dev/null 2>&1 || {
  echo ""; echo "ERROR: SearXNG timeout. Check: docker logs \$(docker ps -q --filter 'publish=4000')"
  exit 1
}

echo "Starting Next.js (native)..."
cd "$PROJECT_DIR"
exec yarn dev
