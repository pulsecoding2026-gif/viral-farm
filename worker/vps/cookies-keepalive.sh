#!/usr/bin/env bash
# =============================================================================
# Mantém viva a sessão do YouTube usada pelo yt-dlp.
#
#   bash worker/vps/cookies-keepalive.sh
#
# POR QUE ISTO EXISTE
#
# O YouTube rotaciona os tokens de sessão (__Secure-1PSIDTS e afins) a cada
# poucas dezenas de minutos. Um cookies.txt exportado congela num instante do
# tempo; quando o yt-dlp apresenta um token já rotacionado, o YouTube derruba
# a sessão INTEIRA. Foi o que fez os cookies durarem menos de 3h aqui.
#
# O `--cookies` do yt-dlp lê E REGRAVA o arquivo com os tokens novos, então o
# uso normal já mantém a sessão viva. O buraco é a OCIOSIDADE: uma madrugada
# sem nenhuma análise e a sessão vence do mesmo jeito. Este script fecha esse
# buraco fazendo uma chamada barata de metadados de tempos em tempos.
#
# De quebra, a própria chamada é o teste de saúde: se ela falhar com bloqueio
# de robô, a conta caiu e alguém precisa reexportar o cookie. Sem isto, a
# falha só apareceria quando um cliente tentasse analisar.
# =============================================================================
set -uo pipefail

RAIZ="${RAIZ:-/opt/viral-farm}"
ESTADO="${ESTADO:-/var/lib/viral-farm}"

# Vídeo curto, estável e sem restrição — só pra exercitar a sessão. Não
# baixamos nada: -J lê só os metadados.
ALVO="${ALVO:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"

STATUS="$ESTADO/cookies-status"
LOCK="$ESTADO/cookies.lock"

mkdir -p "$ESTADO"

# YTDLP_COOKIES mora no .env do worker — uma fonte de verdade só.
COOKIES="$(grep -E '^YTDLP_COOKIES=' "$RAIZ/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' ')"

registrar() {
  # <estado> <detalhe> — lido pelo painel de saúde e pelo humano de plantão.
  printf '%s\t%s\t%s\n' "$(date -Iseconds)" "$1" "$2" > "$STATUS"
  echo "[cookies] $1: $2"
}

if [[ -z "$COOKIES" ]]; then
  registrar sem_cookie "YTDLP_COOKIES não está no $RAIZ/.env"
  exit 0
fi

if [[ ! -s "$COOKIES" ]]; then
  registrar sem_cookie "arquivo $COOKIES não existe ou está vazio"
  exit 1
fi

# flock serializa contra o worker: os dois escrevem no MESMO arquivo, e
# escrita concorrente reintroduz um token velho por cima do novo — que é
# exatamente o que invalida a sessão. -w 0 sai na hora se um job estiver
# rodando: o job já está rotacionando o cookie, então não há o que fazer.
exec 9>"$LOCK"
if ! flock -w 0 9; then
  echo "[cookies] worker está usando o cookie agora — nada a fazer"
  exit 0
fi

# Cópia da última versão boa ANTES de deixar o yt-dlp regravar. É um problema
# conhecido do yt-dlp (issue #13741) o arquivo sair corrompido ou com uma
# versão antiga; sem backup, um acidente custa um relogin manual.
cp -f "$COOKIES" "$COOKIES.bak" 2>/dev/null || true

saida="$(yt-dlp --cookies "$COOKIES" -J --no-warnings --no-playlist \
  --socket-timeout 30 "$ALVO" 2>&1 >/dev/null)"
codigo=$?

if [[ $codigo -eq 0 ]]; then
  registrar ok "sessão renovada"
  exit 0
fi

# Bloqueio de robô com cookie presente = a conta caiu. É diferente de falha de
# rede, e a ação humana também é: reexportar, não esperar.
if grep -qiE "sign in to confirm|not a bot|login required|account has been" <<<"$saida"; then
  registrar morta "a conta do YouTube caiu — reexporte o cookies.txt"
  # Volta o backup: o yt-dlp pode ter gravado uma sessão já inválida por cima.
  [[ -s "$COOKIES.bak" ]] && cp -f "$COOKIES.bak" "$COOKIES"
  exit 2
fi

registrar instavel "$(head -c 200 <<<"$saida" | tr '\n' ' ')"
exit 1
