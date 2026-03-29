#!/bin/bash
# Run this ON the Mac Mini after copying the Perplexica repo there.
# Usage:
#   1. From your MacBook: rsync -azP --exclude=node_modules --exclude=.next --exclude=.git --exclude=.searxng --exclude=.claude ~/Desktop/Claude\ Coding\ Projects/Perplexica/ nexusadmin@100.119.211.101:~/perplexica/
#   2. SSH into Mini: ssh nexusadmin@100.119.211.101
#   3. Run: cd ~/perplexica && bash scripts/setup-mini.sh

set -euo pipefail

echo "=== Perplexica Production Setup for M1 Mac Mini ==="
echo ""

# Step 1: Install pm2 if needed
if ! command -v pm2 &>/dev/null; then
  echo "[1/5] Installing pm2..."
  npm install -g pm2
else
  echo "[1/5] pm2 already installed"
fi

# Step 2: Install dependencies
echo "[2/5] Installing dependencies..."
yarn install

# Step 3: Build
echo "[3/5] Building production bundle..."
NODE_OPTIONS="--max-old-space-size=3072" yarn build

# Step 4: Start SearXNG
echo "[4/5] Starting SearXNG via Docker..."
if docker ps | grep -q searxng; then
  echo "  SearXNG already running"
else
  docker compose -f docker-compose.search.yaml up -d 2>/dev/null || {
    echo "  Docker compose failed — trying docker run..."
    docker run -d --name searxng \
      -p 4000:8080 \
      -v "$(pwd)/searxng:/etc/searxng:ro" \
      -e SEARXNG_SECRET=devsecret \
      --restart unless-stopped \
      searxng/searxng:latest
  }
fi

# Wait for SearXNG
echo "  Waiting for SearXNG..."
for i in $(seq 1 15); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 2>/dev/null | grep -q "200\|302"; then
    echo "  SearXNG ready!"
    break
  fi
  sleep 2
done

# Step 5: Start Perplexica with pm2
echo "[5/5] Starting Perplexica with pm2..."
pm2 delete perplexica 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo ""
echo "  Setting up pm2 startup on boot..."
pm2 startup 2>/dev/null || echo "  (Run the command pm2 gives you above with sudo)"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "  App:    http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3000"
echo "  App:    http://100.119.211.101:3000  (Tailscale)"
echo "  Logs:   pm2 logs perplexica"
echo "  Status: pm2 status"
echo "  Stop:   pm2 stop perplexica"
echo ""
