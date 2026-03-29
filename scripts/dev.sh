#!/usr/bin/env bash
set -euo pipefail

PORTS=(3000 4000)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SEARXNG_DIR="$PROJECT_DIR/.searxng"
VENV_DIR="$SEARXNG_DIR/venv"
CONF_DIR="$SEARXNG_DIR/conf"
LOG_DIR="$PROJECT_DIR/logs"
SEARXNG_PID=""
NEXTJS_PID=""

mkdir -p "$LOG_DIR"

cleanup() {
  echo ""
  if [ -n "$NEXTJS_PID" ] && kill -0 "$NEXTJS_PID" 2>/dev/null; then
    kill "$NEXTJS_PID" 2>/dev/null || true
  fi
  if [ -n "$SEARXNG_PID" ] && kill -0 "$SEARXNG_PID" 2>/dev/null; then
    echo "Stopping SearXNG (PID $SEARXNG_PID)..."
    kill "$SEARXNG_PID" 2>/dev/null || true
    wait "$SEARXNG_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# 1. Setup SearXNG if needed
if [ ! -x "$VENV_DIR/bin/python" ] || [ ! -f "$SEARXNG_DIR/searx/webapp.py" ] || ! "$VENV_DIR/bin/python" -c "import msgspec, yaml, flask" 2>/dev/null; then
  echo "SearXNG not set up — running setup (one-time, ~60s)..."
  bash "$PROJECT_DIR/scripts/setup-searxng.sh"
fi

# 2. Kill orphaned processes on our ports
echo "Clearing ports ${PORTS[*]}..."
pkill -f "mcp-server/index.ts" 2>/dev/null || true
pkill -f "tsx.*Perplexica" 2>/dev/null || true
for port in "${PORTS[@]}"; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing process(es) on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done

# 3. Start SearXNG natively (background)
echo "Starting SearXNG on port 4000..."
PYTHONPATH="$SEARXNG_DIR" \
  SEARXNG_SETTINGS_PATH="$CONF_DIR/settings.yml" \
  "$VENV_DIR/bin/python" -m searx.webapp \
  >> "$LOG_DIR/searxng.log" 2>&1 &
SEARXNG_PID=$!
echo "  PID: $SEARXNG_PID  (tail -f logs/searxng.log to watch)"

# 4. Wait for SearXNG to be ready (30s timeout)
echo -n "Waiting for SearXNG"
for i in $(seq 1 30); do
  if ! kill -0 "$SEARXNG_PID" 2>/dev/null; then
    echo " FAILED (process exited early)"
    tail -20 "$LOG_DIR/searxng.log" || true
    exit 1
  fi
  if curl -sf "http://localhost:4000/" >/dev/null 2>&1; then
    echo " ready."
    break
  fi
  sleep 1; echo -n "."
done
if ! curl -sf "http://localhost:4000/" >/dev/null 2>&1; then
  echo ""
  echo "ERROR: SearXNG didn't start after 30s. Check logs/searxng.log"
  tail -20 "$LOG_DIR/searxng.log" || true
  exit 1
fi

echo ""
echo "  SearXNG: http://localhost:4000"
echo "  Next.js: http://localhost:3000"
echo ""

# 5. Start Next.js (background so cleanup trap fires on Ctrl+C)
cd "$PROJECT_DIR"
SEARXNG_API_URL=http://localhost:4000 npx next dev --turbopack &
NEXTJS_PID=$!
wait "$NEXTJS_PID"
