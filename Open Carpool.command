#!/bin/zsh

set -euo pipefail

cd "$(dirname "$0")"

URL="http://127.0.0.1:3000"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

if lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Carpool is already running at $URL"
  open "$URL"
  exit 0
fi

(
  for _ in {1..45}; do
    if curl -fsS "$URL" >/dev/null 2>&1; then
      open "$URL"
      exit 0
    fi
    sleep 1
  done
  open "$URL"
) &

echo "Starting Carpool locally at $URL"
npm run dev:local
