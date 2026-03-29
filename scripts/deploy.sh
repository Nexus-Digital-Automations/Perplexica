#!/bin/bash
# Deploy to Mac Mini via git push
# Usage: bash scripts/deploy.sh
set -euo pipefail

echo "Deploying to Mac Mini..."
git push mini master

echo ""
echo "Deploy triggered. Check progress:"
echo "  ssh nexusadmin@100.119.211.101 'tail -20 ~/deploy.log'"
echo ""
echo "App: http://100.119.211.101:3000"
