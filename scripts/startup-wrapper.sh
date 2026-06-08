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

# --- Restore bundled @crabwatch/shared ---
# Only restore from backup if the bundled version is missing or broken
# (i.e. lacks the dist/ subdirectory expected by package.json "main" field)
if [ -d node_modules/@crabwatch/shared/dist ]; then
  echo "[STARTUP] @crabwatch/shared already bundled with dist/, skipping backup restore"
elif [ -d /home/site/shared-backup/@crabwatch/shared ]; then
  echo "[STARTUP] Restoring @crabwatch/shared from backup"
  mkdir -p node_modules/@crabwatch
  rm -rf node_modules/@crabwatch/shared
  cp -R /home/site/shared-backup/@crabwatch/shared node_modules/@crabwatch/shared
elif [ -f node_modules.tar.gz ]; then
  echo "[STARTUP] Extracting @crabwatch/shared from node_modules.tar.gz"
  mkdir -p node_modules/@crabwatch
  tar -xzf node_modules.tar.gz -C node_modules ./@crabwatch/shared 2>/dev/null || true
  mkdir -p /home/site/shared-backup
  cp -R node_modules/@crabwatch/shared /home/site/shared-backup/@crabwatch/shared 2>/dev/null || true
else
  echo "[STARTUP] WARNING: @crabwatch/shared not found — app may fail to start"
fi

# --- Start the server ---
echo "[STARTUP] Starting server..."
exec node dist/server/src/index.js
