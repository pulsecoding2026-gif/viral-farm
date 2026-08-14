#!/usr/bin/env bash
# =============================================================================
# Ambiente de visão computacional pro rastreamento de rosto.
#
#   bash worker/vps/instalar-visao.sh
#
# POR QUE UM VENV E NÃO O opencv DO APT
#
# O apt entrega OpenCV 4.6, e o modelo YuNet atual quebra nele: a camada
# eltwise recusa o formato com "inputs[vecIdx][j] == inputs[i][j]". Caçar um
# modelo antigo compatível seria trocar um problema de hoje por uma dívida —
# modelo velho detecta pior e vai sair do repositório algum dia.
#
# opencv-python-headless traz a versão nova SEM as dependências de GUI, que
# numa VPS sem tela seriam dezenas de megabytes de peso morto.
#
# CUSTO MEDIDO NESTA MÁQUINA (1 vCPU), detectando a 640px:
#   13 ms por frame → 1,6s de CPU por minuto de vídeo amostrado a 2fps.
# Irrelevante perto dos ~60s que o render do mesmo corte já leva.
#
# A 1920px seriam 125 ms (15s por minuto de vídeo) — 9x mais caro sem ganho
# real, porque rosto em 640px ainda é grande o bastante pro detector.
# =============================================================================
set -euo pipefail

VENV=/opt/viral-farm/.venv-visao
MODELO="$VENV/yunet.onnx"

# O modelo tem dimensão dinâmica e é o que o OpenCV 5 espera. Se um dia a
# instalação cair pro OpenCV 4.x, o arquivo a usar é o 2023mar.
URL_MODELO="https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2026may.onnx"

echo "==> preparando $VENV"
if [[ ! -d "$VENV" ]]; then
  apt-get install -y python3-venv >/dev/null 2>&1 || true
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet opencv-python-headless numpy

if [[ ! -s "$MODELO" ]]; then
  echo "==> baixando o modelo YuNet"
  curl -fsSL --max-time 120 "$URL_MODELO" -o "$MODELO"
fi

echo "==> versão instalada:"
"$VENV/bin/python" -c "import cv2; print('   opencv', cv2.__version__)"
echo "==> modelo: $(du -h "$MODELO" | cut -f1) em $MODELO"
