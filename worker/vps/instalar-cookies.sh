#!/usr/bin/env bash
# =============================================================================
# Instala a sessão do YouTube e o agendamento que a mantém viva.
#
#   bash worker/vps/instalar-cookies.sh /caminho/do/cookies.txt
#
# Recebe o cookies.txt exportado (ver COMO EXPORTAR abaixo), guarda em local
# fixo com permissão restrita, aponta o worker pra ele e cria o timer que
# renova a sessão a cada 15 minutos.
#
# COMO EXPORTAR (o passo que quase todo mundo erra):
#   1. Libere a extensão "Get cookies.txt LOCALLY" no modo anônimo
#      (chrome://extensions → Detalhes → Permitir no modo anônimo)
#   2. Abra uma janela ANÔNIMA e faça login no YouTube
#   3. NA MESMA ABA, vá para https://www.youtube.com/robots.txt
#   4. Exporte os cookies de youtube.com
#   5. FECHE a janela anônima — essa sessão não pode abrir num navegador
#      nunca mais
#
# O passo 3 existe porque uma aba do YouTube aberta fica rotacionando os
# tokens; o 5, porque qualquer uso posterior no navegador invalida a
# exportação. Daí em diante só o yt-dlp mexe nessa sessão.
# =============================================================================
set -euo pipefail

ORIGEM="${1:-}"
RAIZ="${RAIZ:-/opt/viral-farm}"
ESTADO="${ESTADO:-/var/lib/viral-farm}"
DESTINO="$ESTADO/cookies.txt"

if [[ -z "$ORIGEM" ]]; then
  echo "uso: bash worker/vps/instalar-cookies.sh /caminho/do/cookies.txt" >&2
  exit 1
fi

if [[ ! -s "$ORIGEM" ]]; then
  echo "erro: $ORIGEM não existe ou está vazio" >&2
  exit 1
fi

# O yt-dlp exige o cabeçalho Netscape; sem ele a falha é silenciosa (ele
# ignora o arquivo e tenta anônimo, que dá justamente o bloqueio de robô).
if ! head -1 "$ORIGEM" | grep -qE '^# (HTTP|Netscape HTTP) Cookie File'; then
  echo "erro: $ORIGEM não parece formato Netscape." >&2
  echo "      A primeira linha tem que ser '# Netscape HTTP Cookie File'." >&2
  echo "      Exporte com a extensão 'Get cookies.txt LOCALLY', não com" >&2
  echo "      EditThisCookie (essa gera JSON)." >&2
  exit 1
fi

if ! grep -q '__Secure-1PSID' "$ORIGEM"; then
  echo "erro: não achei cookie de sessão logada em $ORIGEM." >&2
  echo "      Você exportou deslogado, ou exportou de outro domínio." >&2
  exit 1
fi

mkdir -p "$ESTADO"
install -m 600 "$ORIGEM" "$DESTINO"
cp -f "$DESTINO" "$DESTINO.bak"
echo "==> cookie instalado em $DESTINO (modo 600)"

# Aponta o worker pro arquivo, sem duplicar a linha se já existir.
if grep -qE '^YTDLP_COOKIES=' "$RAIZ/.env"; then
  sed -i "s|^YTDLP_COOKIES=.*|YTDLP_COOKIES=$DESTINO|" "$RAIZ/.env"
else
  echo "YTDLP_COOKIES=$DESTINO" >> "$RAIZ/.env"
fi
echo "==> YTDLP_COOKIES apontado no $RAIZ/.env"

# --- timer de 15 min --------------------------------------------------------
# systemd em vez de cron: OnUnitActiveSec conta a partir do FIM da execução
# anterior, então uma chamada lenta não empilha com a próxima.
cat > /etc/systemd/system/viral-cookies.service <<FIM
[Unit]
Description=Renova a sessão do YouTube usada pelo yt-dlp

[Service]
Type=oneshot
ExecStart=/usr/bin/env bash $RAIZ/worker/vps/cookies-keepalive.sh
FIM

cat > /etc/systemd/system/viral-cookies.timer <<'FIM'
[Unit]
Description=Renova a sessão do YouTube a cada 15 minutos

[Timer]
OnBootSec=3min
OnUnitActiveSec=15min
# Sem isso, todo boot dispara no mesmo segundo — padrão que por si só
# parece automação.
RandomizedDelaySec=120

[Install]
WantedBy=timers.target
FIM

systemctl daemon-reload
systemctl enable --now viral-cookies.timer
echo "==> timer viral-cookies ativo (a cada 15 min)"

echo ""
echo "Testando a sessão agora..."
bash "$RAIZ/worker/vps/cookies-keepalive.sh" || true

echo ""
echo "Estado atual:  cat $ESTADO/cookies-status"
echo "Próximas execuções:  systemctl list-timers viral-cookies"
echo "Log:  journalctl -u viral-cookies -n 30"
