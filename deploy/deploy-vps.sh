#!/usr/bin/env bash
set -euo pipefail

SERVER="${SERVER:?请设置 SERVER，例如 root@1.2.3.4}"

echo "building frontend..."
cd "$(dirname "$0")/../web"
pnpm install --frozen-lockfile
pnpm build

echo "uploading to server..."
rsync -av --delete ./dist/ "$SERVER:/opt/multimod/web/dist/"
rsync -av --delete ../server/ "$SERVER:/opt/multimod/server/"

echo "installing and restarting..."
ssh "$SERVER" "cd /opt/multimod/server && pnpm install --prod && systemctl restart multimod"
echo "deploy ok"
