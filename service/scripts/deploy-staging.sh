#!/usr/bin/env bash
set -euo pipefail

VE_TRACK_STAGING_DB_ID="${VE_TRACK_STAGING_DB_ID:-682a8556-98ed-4b21-91bb-2699382b6779}"

echo "Building..."
bun run build

echo "Patching build config for staging..."
VE_TRACK_STAGING_DB_ID="$VE_TRACK_STAGING_DB_ID" node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('build/server/wrangler.json', 'utf8'));

config.name = 've-track-staging';
config.keep_vars = true;
config.vars = {
  VE_APP: 've-track',
  APP_URL: 'https://track-staging.vieweng.in',
};
config.routes = [{ pattern: 'track-staging.vieweng.in', custom_domain: true }];
config.d1_databases = [
  {
    binding: 'DB',
    database_name: 've-track-staging-db',
    database_id: process.env.VE_TRACK_STAGING_DB_ID,
    migrations_dir: '../../backend/migrations',
  },
];

fs.writeFileSync('build/server/wrangler.json', JSON.stringify(config, null, 2));
"

echo "Applying D1 migrations to staging..."
bunx wrangler d1 migrations apply DB --remote --config build/server/wrangler.json

echo "Deploying to staging..."
bunx wrangler deploy --config build/server/wrangler.json

echo "Done! Staging deployed to https://track-staging.vieweng.in"
