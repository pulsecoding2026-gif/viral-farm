#!/usr/bin/env bash
# Atualiza o worker da VPS com o código novo do master.
#
#   bash /opt/viral-farm/worker/vps/atualizar.sh
#
# Por que --no-save no npm:
#   O package-lock.json é gerado no Windows e não traz os pacotes opcionais
#   que só existem no Linux (@emnapi/*, dependência transitiva do sharp). Por
#   isso `npm ci` recusa a instalar ("package.json and package-lock.json are
#   not in sync") e `npm install` normal REESCREVE o lock — deixando o repo
#   sujo, o que faz o próximo `git pull` abortar. --no-save instala o que
#   falta e não encosta no lock: o git continua limpo entre deploys.
set -euo pipefail

cd /opt/viral-farm

echo "==> Antes: $(git log --oneline -1)"

# O lock é gerado; se um npm install antigo o sujou, a versão do repo manda.
git checkout -- package-lock.json 2>/dev/null || true
git pull --ff-only

npm install --no-save --no-audit --no-fund

echo "==> Depois: $(git log --oneline -1)"

pm2 restart viral-worker
sleep 3
pm2 logs viral-worker --lines 5 --nostream --out
