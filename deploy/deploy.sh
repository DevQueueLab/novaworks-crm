#!/usr/bin/env sh
# Build + (re)start NovaWorks CRM on the shared VPS. Run as root in /opt/novaworks.
#
#   1. install + `next build` inside a memory-capped, OOM-preferred container
#      (a runaway build can only ever kill itself, never a neighbour's process)
#   2. package the standalone output into a small runtime image
#   3. recreate the web container; migrations + demo seed run on its startup
set -eu
cd "$(dirname "$0")/../.."   # /opt/novaworks

docker run --rm --name novaworks-build \
  --memory=2g --memory-swap=2g --oom-score-adj=1000 --cpus=3 \
  -v "$PWD/app:/app" -w /app \
  -v novaworks_pnpm_store:/root/.local/share/pnpm/store \
  -e CI=true -e NEXT_TELEMETRY_DISABLED=1 \
  node:24-alpine sh -ec "npm install -g pnpm@11.21.0 >/dev/null 2>&1 && pnpm install --frozen-lockfile && pnpm build"

docker compose build web
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
docker compose ps
