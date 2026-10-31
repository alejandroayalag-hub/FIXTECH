#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="root@62.238.3.136"
export RSYNC_RSH="ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes"
ssh() { command ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes "$@"; }

echo "→ Construyendo frontend..."
cd "$ROOT_DIR/frontend"
npm run build

echo "→ Sincronizando backend (sin tocar uploads)..."
rsync -az --delete --chown=apps:apps \
  --exclude='uploads/' \
  --exclude='node_modules/' \
  --exclude='.env' \
  "$ROOT_DIR/backend/" $SERVER:/home/apps/fixtech/backend/

echo "→ Sincronizando frontend dist..."
rsync -az --delete --chown=apps:apps \
  "$ROOT_DIR/frontend/dist/" $SERVER:/home/apps/fixtech/frontend/dist/

echo "→ Instalando dependencias y reiniciando..."
ssh $SERVER "cd /home/apps/fixtech/backend && sudo -u apps npm install --omit=dev --silent && sudo -u apps pm2 restart fixtech-backend"

echo "→ Verificando..."
sleep 2
ssh $SERVER "sudo -u apps pm2 show fixtech-backend | grep -E 'status|restarts'"

echo "✓ Deploy completado"
