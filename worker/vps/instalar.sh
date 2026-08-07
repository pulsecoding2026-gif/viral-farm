#!/usr/bin/env bash
# =============================================================================
# Instalação do worker do Viral Farm numa VPS Ubuntu 24.04 zerada.
#
# Uso (como root):
#   bash worker/vps/instalar.sh
#
# O que instala: Node 22 LTS, ffmpeg, yt-dlp, fontes, pm2 — e deixa o worker
# rodando pra sempre (reinicia se cair, sobe com a máquina).
# =============================================================================
set -euo pipefail

echo "==> Pacotes do sistema"
apt-get update -y
apt-get install -y curl git ffmpeg fonts-liberation python3

echo "==> Node.js 22 LTS"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> yt-dlp (binário oficial, atualizável com: yt-dlp -U)"
curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

echo "==> pm2"
npm install -g pm2

echo "==> Código"
if [[ ! -d /opt/viral-farm ]]; then
  git clone https://github.com/pulsecoding2026-gif/viral-farm.git /opt/viral-farm
fi
cd /opt/viral-farm
git pull
npm install

if [[ ! -f /opt/viral-farm/.env ]]; then
  cat > /opt/viral-farm/.env <<'FIM'
# ===== PREENCHA E RODE DE NOVO: bash worker/vps/instalar.sh =====
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
# Cérebro dos cortes (LLM=deepseek é o padrão; LLM=claude usa ANTHROPIC_API_KEY)
DEEPSEEK_API_KEY=
# Transcrição (TRANSCRITOR=groq exige GROQ_API_KEY)
TRANSCRITOR=groq
GROQ_API_KEY=
# Cortes servem pra vídeo LONGO — o limite de 3min era do produto antigo.
MAX_DURACAO_SEGUNDOS=5400
FIM
  echo ""
  echo "!! Criei /opt/viral-farm/.env vazio."
  echo "!! Preencha as chaves (nano /opt/viral-farm/.env) e rode este script de novo."
  exit 0
fi

echo "==> Subindo o worker no pm2"
pm2 start worker/vps/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo ""
echo "Pronto. Comandos úteis:"
echo "  pm2 status            — estado do worker"
echo "  pm2 logs viral-worker — logs ao vivo"
echo "  cd /opt/viral-farm && git pull && pm2 restart viral-worker  — atualizar"
