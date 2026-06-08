#!/bin/bash
set -e
cd /home/site/wwwroot

echo "[STARTUP] === CrabWatch server startup ==="

# --- Fix Oryx node_modules symlink ---
# Oryx extracts stale node_modules.tar.gz to /node_modules and symlinks
# wwwroot/node_modules -> /node_modules. This cached tar only contains
# @crabwatch/shared, missing all server dependencies (express, etc.).
# We must remove the symlink and do a proper npm install.
if [ -L node_modules ]; then
  echo "[STARTUP] Removing Oryx node_modules symlink"
  rm -f node_modules
fi
# Also remove Oryx's extracted root-level modules
if [ -d /node_modules ]; then
  echo "[STARTUP] Removing Oryx /node_modules"
  rm -rf /node_modules
fi
# Remove _del_node_modules leftover from Oryx
if [ -d _del_node_modules ]; then
  rm -rf _del_node_modules
fi

# Clean Oryx cache to prevent re-extraction on next boot
rm -f /home/site/node_modules.tar.gz /home/site/oryx-manifest.toml
rm -f /home/site/wwwroot/oryx-manifest.toml

# --- Install production dependencies ---
# Always install if node_modules is missing or doesn't contain express
# (avoids relying on install-done marker which can get out of sync)
if [ ! -d node_modules/express ]; then
  echo "[STARTUP] Installing production dependencies..."
  npm install --omit=dev --no-audit --no-fund --no-package-lock 2>&1 | tail -20
  echo "[STARTUP] Dependencies installed successfully"
else
  echo "[STARTUP] node_modules already present, skipping install"
fi

# --- Restore bundled @crabwatch/shared ---
# The shared package is bundled in the deploy zip but npm install won't
# know about it (it's a workspace package, not in package.json deps).
# Try restoring from persistent backup first, then from zip bundle.
if [ -d /home/site/shared-backup/@crabwatch/shared ]; then
  echo "[STARTUP] Restoring @crabwatch/shared from backup"
  mkdir -p node_modules/@crabwatch
  rm -rf node_modules/@crabwatch/shared
  cp -R /home/site/shared-backup/@crabwatch/shared node_modules/@crabwatch/shared
elif [ -f node_modules.tar.gz ]; then
  echo "[STARTUP] Extracting @crabwatch/shared from node_modules.tar.gz"
  mkdir -p node_modules/@crabwatch
  tar -xzf node_modules.tar.gz -C node_modules ./@crabwatch/shared 2>/dev/null || true
  # Also save to persistent backup for next boot
  mkdir -p /home/site/shared-backup
  cp -R node_modules/@crabwatch/shared /home/site/shared-backup/@crabwatch/shared 2>/dev/null || true
else
  echo "[STARTUP] WARNING: @crabwatch/shared not found — app may fail to start"
fi

# --- Start the server ---
echo "[STARTUP] Starting server..."
exec node dist/server/src/index.js
