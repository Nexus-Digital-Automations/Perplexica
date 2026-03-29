#!/usr/bin/env bash
set -euo pipefail

PORTS=(3000 4000)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
COMPOSE=(docker compose -f "$PROJECT_DIR/docker-compose.dev.yaml")

mkdir -p "$LOG_DIR"
exec >> "$LOG_DIR/startup.log" 2>&1
echo "=== Perplexica startup $(date) ==="

# 1. Open Docker Desktop if not running
if ! docker info >/dev/null 2>&1; then
  echo "Starting Docker Desktop..."
  open -a Docker
  echo "Waiting for Docker to be ready (up to 60s)..."
  for i in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    sleep 2
  done
  docker info >/dev/null 2>&1 || { echo "ERROR: Docker failed to start. Aborting."; exit 1; }
  echo "Docker is ready."
fi

# 2. Stop any Docker containers using our ports (handles any project name)
echo "Stopping containers on ports ${PORTS[*]}..."
for port in "${PORTS[@]}"; do
  cids=$(docker ps -q --filter "publish=$port" 2>/dev/null || true)
  if [ -n "$cids" ]; then
    echo "  Stopping container(s) on port $port"
    echo "$cids" | xargs docker stop 2>/dev/null || true
  fi
done

# 3. Stop the compose project cleanly
"${COMPOSE[@]}" down --remove-orphans 2>/dev/null || true

# 4. Kill any remaining non-Docker processes on those ports
for port in "${PORTS[@]}"; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing orphaned process(es) on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done

echo "Starting containers..."
"${COMPOSE[@]}" up -d --build
echo "Done. App: http://localhost:3000 | SearXNG: http://localhost:4000"
