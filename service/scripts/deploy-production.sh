#!/usr/bin/env bash
set -euo pipefail

VE_TRACK_PROD_DB_ID="${VE_TRACK_PROD_DB_ID:-66b088b2-4d8b-48af-b0e4-1821d0309b5c}"

echo "Building..."
bun run build

echo "Patching build config for production..."
VE_TRACK_PROD_DB_ID="$VE_TRACK_PROD_DB_ID" node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('build/server/wrangler.json', 'utf8'));

config.name = 've-track-prod';
config.keep_vars = true;
config.vars = {
  VE_APP: 've-track',
  APP_URL: 'https://track.viewengine.ai',
};
config.routes = [{ pattern: 'track.viewengine.ai', custom_domain: true }];
config.d1_databases = [
  {
    binding: 'DB',
    database_name: 've-track-prod-db',
    database_id: process.env.VE_TRACK_PROD_DB_ID,
    migrations_dir: '../../backend/migrations',
  },
];

const PROD_QUEUE = 've-track-tracker-sync-prod';
(config.queues && config.queues.producers || []).forEach(function (p) { p.queue = PROD_QUEUE; });
(config.queues && config.queues.consumers || []).forEach(function (c) { c.queue = PROD_QUEUE; });

fs.writeFileSync('build/server/wrangler.json', JSON.stringify(config, null, 2));
"

echo "Ensuring production queue exists..."
bunx wrangler queues create ve-track-tracker-sync-prod 2>/dev/null || true

echo "Applying D1 migrations to production..."
bunx wrangler d1 migrations apply DB --remote --config build/server/wrangler.json

echo "Deploying to production..."
bunx wrangler deploy --config build/server/wrangler.json

echo "Done! Production deployed to https://track.viewengine.ai"
