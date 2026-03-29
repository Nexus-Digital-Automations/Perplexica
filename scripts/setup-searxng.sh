#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SEARXNG_DIR="$PROJECT_DIR/.searxng"
VENV_DIR="$SEARXNG_DIR/venv"
CONF_DIR="$SEARXNG_DIR/conf"

# 1. Find Python 3.10+
PYTHON=""
for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" &>/dev/null; then
    major=$("$candidate" -c 'import sys; print(sys.version_info.major)')
    minor=$("$candidate" -c 'import sys; print(sys.version_info.minor)')
    if [ "$major" -ge 3 ] && [ "$minor" -ge 10 ]; then
      PYTHON="$candidate"
      break
    fi
  fi
done
if [ -z "$PYTHON" ]; then
  echo "ERROR: Python 3.10+ required. Install via: brew install python@3.12"
  exit 1
fi
echo "Using: $PYTHON ($($PYTHON --version))"

# 2. Clone SearXNG (idempotent)
if [ -d "$SEARXNG_DIR/.git" ]; then
  echo "SearXNG repo already cloned — skipping."
else
  echo "Cloning SearXNG..."
  git clone --depth=1 https://github.com/searxng/searxng.git "$SEARXNG_DIR"
fi

# 3. Create venv (idempotent)
if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "Creating venv..."
  "$PYTHON" -m venv "$VENV_DIR"
fi

# 4. Install deps (idempotent)
#    SearXNG's setup.py imports msgspec at build time, breaking `pip install -e .`
#    with build isolation. Install directly from the requirements files instead.
if ! "$VENV_DIR/bin/python" -c "import msgspec, yaml, flask" 2>/dev/null; then
  echo "Installing SearXNG deps (this takes ~60s)..."
  "$VENV_DIR/bin/pip" install --quiet --upgrade pip setuptools wheel
  "$VENV_DIR/bin/pip" install --quiet -r "$SEARXNG_DIR/requirements.txt"
  "$VENV_DIR/bin/pip" install --quiet -r "$SEARXNG_DIR/requirements-server.txt"
fi

# 5. Generate conf/settings.yml via Python YAML merge (port=4000 injected)
#    Cannot use shell heredoc append — YAML duplicate keys lose secret_key.
#    Use Python (venv has PyYAML from SearXNG deps) for proper merge.
mkdir -p "$CONF_DIR"
"$VENV_DIR/bin/python" << PYEOF
import yaml

with open('${PROJECT_DIR}/searxng/settings.yml') as f:
    settings = yaml.safe_load(f)

if 'server' not in settings:
    settings['server'] = {}
settings['server']['port'] = 4000
settings['server']['bind_address'] = '0.0.0.0'

with open('${CONF_DIR}/settings.yml', 'w') as f:
    yaml.dump(settings, f, default_flow_style=False, allow_unicode=True)

print('Generated: ${CONF_DIR}/settings.yml')
PYEOF

# 6. Copy limiter.toml
cp "$PROJECT_DIR/searxng/limiter.toml" "$CONF_DIR/limiter.toml"

echo ""
echo "SearXNG setup complete at $SEARXNG_DIR"
echo "  Run: yarn dev  (updated dev.sh handles startup automatically)"
