#!/bin/sh
set -e

# Start the Model Manager backend if enabled
if [ "${ENABLE_MODEL_MANAGER}" = "true" ]; then
  echo "Starting Model Manager backend on port 3001..."
  node /app/server/index.js &
fi

# Start nginx in the foreground
exec nginx -g "daemon off;"
