#!/bin/bash
# Production start script for Perplexica on M1 Mac Mini (8GB)
# Caps Node.js heap at 3GB to leave room for macOS + SearXNG

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

export NODE_OPTIONS="--max-old-space-size=3072"
export NODE_ENV="production"
export PORT="${PORT:-3000}"

cd "$PROJECT_DIR"

echo "Starting Perplexica (production) on port $PORT..."
echo "  Node heap limit: 3072MB"
echo "  Working dir: $PROJECT_DIR"

exec node .next/standalone/server.js
