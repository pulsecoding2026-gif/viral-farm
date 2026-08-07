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

# fetch + reset, não pull.
#
# Esta máquina é ALVO de deploy: o que vale é o que está no master, nunca o
# que está no disco. E ela GERA arquivos versionados — o package-lock (que o
# npm reescreve) e as miniaturas dos formatos (worker/gerar-miniaturas.ts
# escreve em public/formatos, que é commitado). Com `pull --ff-only`, cada um
# desses aborta a atualização com "local changes would be overwritten", e o
# deploy falha em silêncio: o script segue, reinicia o pm2 e você acha que
# subiu código novo que nunca chegou.
#
# .env e segredos/ sobrevivem porque estão no .gitignore.
git fetch --quiet origin master
git reset --hard --quiet origin/master

npm install --no-save --no-audit --no-fund

echo "==> Depois: $(git log --oneline -1)"

# Guarda contra deploy que não chegou: sem isto, um fetch que falhou por
# rede reiniciaria o worker no código velho sem avisar ninguém.
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/master)" ]]; then
  echo "!! HEAD não bate com origin/master — NÃO reiniciei o worker." >&2
  exit 1
fi

pm2 restart viral-worker
sleep 3
pm2 logs viral-worker --lines 5 --nostream --out
