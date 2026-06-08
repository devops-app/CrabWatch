#!/bin/bash
set -e
cd /home/site/wwwroot

# Remove Oryx cache to prevent stale node_modules restoration
rm -f /home/site/node_modules.tar.gz /home/site/oryx-manifest.toml

# Install production deps on first boot (skip if marker exists)
if [ ! -f /home/site/install-done ]; then
  echo "Installing production dependencies..."
  rm -rf node_modules
  npm install --omit=dev --no-audit --no-fund --no-package-lock
  touch /home/site/install-done
  echo "Dependencies installed successfully"
fi

# Ensure a backup copy of bundled @crabwatch/shared exists
if [ ! -d /home/site/shared-backup/@crabwatch/shared ] && [ -f /home/site/wwwroot/node_modules.tar.gz ]; then
  rm -rf /home/site/shared-backup
  mkdir -p /home/site/shared-backup
  tar -xzf /home/site/wwwroot/node_modules.tar.gz -C /home/site/shared-backup ./@crabwatch/shared || true
fi

# Restore bundled @crabwatch/shared after npm install
if [ -d /home/site/shared-backup/@crabwatch/shared ]; then
  mkdir -p node_modules/@crabwatch
  rm -rf node_modules/@crabwatch/shared
  cp -R /home/site/shared-backup/@crabwatch/shared node_modules/@crabwatch/shared
fi

# Start the server
exec node dist/server/src/index.js
