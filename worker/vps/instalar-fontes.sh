#!/usr/bin/env bash
# =============================================================================
# Instala as tipografias que os 15 formatos pedem.
#
#   bash worker/vps/instalar-fontes.sh
#
# POR QUE ISTO EXISTE
#
# A VPS tinha só fonts-liberation. Resultado: as 11 famílias que os presets
# pedem (Anton, Montserrat, Poppins, Inter, Archivo, Space Grotesk, Playfair
# Display, IBM Plex Sans, JetBrains Mono) caíam TODAS em Liberation Mono —
# monoespaçada.
#
# Em monoespaçada todo caractere ocupa a mesma célula, então:
#   - o ponto final de "GAME." ganha uma célula inteira e parece solto
#   - o espaço entre palavras fica largo e parece duplo
#   - e os 15 formatos saem visualmente idênticos, com cara de terminal
#
# Era esse o bug das legendas. O gerador de ASS estava correto o tempo todo.
#
# Onde existe peso estático (Anton, Poppins, Archivo Black), usamos ele. O
# resto do catálogo do Google virou VARIÁVEL e não tem mais estático: aí o
# libass carrega a instância padrão e o flag Bold do ASS engrossa. Os
# colchetes do nome precisam vir percent-encoded na URL.
# =============================================================================
set -uo pipefail

DESTINO=/usr/local/share/fonts/viralfarm
RAW=https://github.com/google/fonts/raw/main

mkdir -p "$DESTINO"

# nome do arquivo|caminho no repo google/fonts
FONTES=(
  "Anton-Regular.ttf|ofl/anton/Anton-Regular.ttf"
  "Poppins-Bold.ttf|ofl/poppins/Poppins-Bold.ttf"
  "Poppins-ExtraBold.ttf|ofl/poppins/Poppins-ExtraBold.ttf"
  "Poppins-Regular.ttf|ofl/poppins/Poppins-Regular.ttf"
  "ArchivoBlack-Regular.ttf|ofl/archivoblack/ArchivoBlack-Regular.ttf"
  "Montserrat.ttf|ofl/montserrat/Montserrat%5Bwght%5D.ttf"
  "Inter.ttf|ofl/inter/Inter%5Bopsz,wght%5D.ttf"
  "InterTight.ttf|ofl/intertight/InterTight%5Bwght%5D.ttf"
  "Archivo.ttf|ofl/archivo/Archivo%5Bwdth,wght%5D.ttf"
  "SpaceGrotesk.ttf|ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf"
  "PlayfairDisplay.ttf|ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf"
  "IBMPlexSans.ttf|ofl/ibmplexsans/IBMPlexSans%5Bwdth,wght%5D.ttf"
  "JetBrainsMono.ttf|ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
)

baixados=0
falhas=()

for item in "${FONTES[@]}"; do
  # O nome vem separado porque o caminho traz %5B..%5D e viraria nome de
  # arquivo ilegível.
  nome="${item%%|*}"
  caminho="${item#*|}"
  arquivo="$DESTINO/$nome"
  if [[ -s "$arquivo" ]]; then
    baixados=$((baixados + 1))
    continue
  fi
  if curl -fsSL --max-time 60 "$RAW/$caminho" -o "$arquivo" && [[ -s "$arquivo" ]]; then
    baixados=$((baixados + 1))
  else
    rm -f "$arquivo"
    falhas+=("$caminho")
  fi
done

echo "==> $baixados arquivo(s) de fonte em $DESTINO"
if [[ ${#falhas[@]} -gt 0 ]]; then
  echo "!! nao baixei ${#falhas[@]}:"
  printf '   %s\n' "${falhas[@]}"
fi

# Sem isto uma fonte ausente cai em Liberation MONO, que e o pior destino
# possivel pra legenda. Sans errada ainda parece legenda; mono nao.
cat > /etc/fonts/local.conf <<'FIM'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- Familia desconhecida deve cair em sans-serif, nunca em monoespacada. -->
  <match target="pattern">
    <test qual="all" name="family" compare="not_eq"><string>monospace</string></test>
    <edit name="family" mode="append_last"><string>sans-serif</string></edit>
  </match>
</fontconfig>
FIM

fc-cache -f >/dev/null 2>&1
echo "==> cache de fontes atualizado"
echo ""
echo "Conferindo o destino de cada familia que os formatos pedem:"
for f in Anton Montserrat Poppins Inter "Inter Tight" Archivo "Archivo Black" "Space Grotesk" "Playfair Display" "IBM Plex Sans" "JetBrains Mono"; do
  printf '  %-18s -> %s\n' "$f" "$(fc-match "$f" family 2>/dev/null)"
done
