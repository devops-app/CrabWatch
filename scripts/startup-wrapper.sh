#!/bin/bash
set -e
cd /home/site/wwwroot

echo "[STARTUP] === CrabWatch server startup ==="

# --- Clean up Oryx artifacts ---
# Oryx may have created a symlink or moved our bundled modules.
if [ -L node_modules ]; then
  echo "[STARTUP] Removing Oryx node_modules symlink"
  rm -f node_modules
fi
if [ -d /node_modules ]; then
  echo "[STARTUP] Removing Oryx /node_modules"
  rm -rf /node_modules
fi
if [ -d _del_node_modules ]; then
  rm -rf _del_node_modules
fi
# Clean Oryx cache to prevent re-extraction on next boot
rm -f /home/site/node_modules.tar.gz /home/site/oryx-manifest.toml
rm -f /home/site/wwwroot/oryx-manifest.toml
# Clean stale shared backup from previous deploy cycles
rm -rf /home/site/shared-backup

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
if [ ! -d node_modules/express ]; then
  echo "[STARTUP] Bundled modules not found — installing on-server..."
  npm install --omit=dev --no-audit --no-fund --no-package-lock 2>&1 | tail -20
  echo "[STARTUP] Dependencies installed successfully"
else
  echo "[STARTUP] node_modules already present, skipping install"
fi

# --- Validate bundled @crabwatch/shared ---
# CI bundles shared into node_modules/@crabwatch/shared/ with dist/ subdirectory
# matching package.json "main": "dist/index.js". No fallback needed — if the
# bundle is broken, the deploy should be re-run.
if [ -f node_modules/@crabwatch/shared/dist/index.js ]; then
  echo "[STARTUP] @crabwatch/shared bundled correctly"
else
  echo "[STARTUP] ERROR: @crabwatch/shared missing or malformed — aborting"
  exit 1
fi

# --- Start the server ---
echo "[STARTUP] Starting server..."
exec node dist/server/src/index.js
