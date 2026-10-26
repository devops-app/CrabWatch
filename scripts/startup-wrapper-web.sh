#!/bin/bash
set -e
cd /home/site/wwwroot

echo "[STARTUP] === CrabWatch web startup ==="

# --- Clean up Oryx artifacts ---
# Oryx may have created a symlink or compressed our bundled modules.
if [ -L node_modules ]; then
  echo "[STARTUP] Removing Oryx node_modules symlink"
  rm -f node_modules
fi
if [ -d /node_modules ]; then
  rm -rf /node_modules 2>/dev/null || true
fi
rm -f /home/site/node_modules.tar.gz /home/site/oryx-manifest.toml
rm -f /home/site/wwwroot/oryx-manifest.toml /home/site/wwwroot/node_modules.tar.zst

# --- Remove stale web/node_modules shadow (leftover from older deploys) ---
rm -rf web/node_modules 2>/dev/null || true

# --- Restore bundled dependencies ---
# Deploy zip includes `bundled_modules` (renamed from node_modules to avoid
# Oryx detection). Rename it back so Node.js can resolve dependencies.
if [ -d bundled_modules ]; then
  if [ -d node_modules ] || [ -L node_modules ]; then
    rm -rf node_modules
  fi
  mv bundled_modules node_modules
  echo "[STARTUP] Restored bundled_modules -> node_modules"
fi

# Fallback: if bundled_modules wasn't available, install on-server
if [ ! -d node_modules/next ]; then
  echo "[STARTUP] Bundled modules not found — installing on-server..."
  npm install --omit=dev --no-audit --no-fund --no-package-lock 2>&1 | tail -20
  echo "[STARTUP] Dependencies installed successfully"
else
  echo "[STARTUP] node_modules already present, skipping install"
fi

# --- Validate ---
if [ -d node_modules/next ] && [ -d node_modules/styled-jsx ]; then
  echo "[STARTUP] next + styled-jsx present"
else
  echo "[STARTUP] ERROR: node_modules incomplete — aborting"
  exit 1
fi

# --- Start the server ---
echo "[STARTUP] Starting web server..."
exec node web/server.js
