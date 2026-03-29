#!/usr/bin/env bash
set -euo pipefail

PORTS=(3000 4000)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_SEARCH=(docker compose -f "$PROJECT_DIR/docker-compose.search.yaml")
COMPOSE_DEV=(docker compose -f "$PROJECT_DIR/docker-compose.dev.yaml")

# 1. Verify OrbStack/Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not available. Start OrbStack.app first."
  echo "  Install: brew install orbstack  or  https://orbstack.dev"
  exit 1
fi

# 2. Stop any containers using our ports
echo "Stopping containers on ports ${PORTS[*]}..."
for port in "${PORTS[@]}"; do
  cids=$(docker ps -q --filter "publish=$port" 2>/dev/null || true)
  if [ -n "$cids" ]; then
    echo "  Stopping container(s) on port $port"
    echo "$cids" | xargs docker stop 2>/dev/null || true
  fi
done

# 3. Bring down both compose projects cleanly
"${COMPOSE_SEARCH[@]}" down --remove-orphans 2>/dev/null || true
"${COMPOSE_DEV[@]}" down --remove-orphans 2>/dev/null || true

# 4. Kill orphaned MCP / Next.js processes
pkill -f "mcp-server/index.ts" 2>/dev/null || true
pkill -f "tsx.*Perplexica" 2>/dev/null || true

# 5. Kill any remaining non-Docker processes on those ports
for port in "${PORTS[@]}"; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing orphaned process(es) on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done

echo "Ports cleared. Starting SearXNG..."
"${COMPOSE_SEARCH[@]}" up -d

echo "Starting Next.js (native)..."
cd "$PROJECT_DIR"
exec yarn dev
