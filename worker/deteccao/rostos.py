#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Detecção de rostos amostrada ao longo de um trecho de vídeo.

Serve ao reenquadramento 16:9 -> 9:16: em vez de crop central fixo, o corte
segue quem está em cena. Este script é só a metade da DETECÇÃO — ele mede onde
estão os rostos e devolve os números crus. Suavização, escolha de quem seguir e
movimento da janela são problema de quem consome.

USO
    python3 worker/deteccao/rostos.py --video CAMINHO [--inicio 12.5]
                                      [--fim 58.0] [--fps 2] [--modelo X.onnx]

SAÍDA (stdout, uma linha, JSON):
    {"largura":1920,"altura":1080,"amostras":[
       {"t":12.5,"rostos":[{"x":820,"y":300,"w":180,"h":220,"conf":0.94,
                            "frontal":0.87,"nitidez":142.5}]}]}

    - `largura`/`altura` são do vídeo ORIGINAL, e as caixas dos rostos estão
      nessa mesma escala (a detecção roda menor, mas reescalamos de volta).
    - `rostos` vem ordenado por ÁREA, maior primeiro — ordem objetiva, NÃO um
      palpite sobre importância. O maior rosto não é o assunto num plano
      over-the-shoulder, onde quem está de costas em primeiro plano é o maior.
    - `frontal` (0..1) diz se o rosto olha para a câmera ou está de perfil;
      `nitidez` diz se está em foco, e só faz sentido comparado com os outros
      rostos do MESMO frame. Juntos, separam o assunto do figurante grande.
    - Amostra sem rosto devolve `"rostos": []`. Ela NÃO é omitida: o consumidor
      precisa distinguir "não tinha ninguém aqui" de "não medi aqui" — a
      primeira exige soltar a câmera, a segunda exige interpolar.

ERRO
    Mensagem em stderr e código de saída != 0. Nunca sai JSON parcial: o
    resultado é montado inteiro em memória e impresso de uma vez só, então
    stdout ou vem completo ou vem vazio.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import urllib.error
import urllib.request

# O log do OpenCV precisa ser silenciado ANTES do import: o backend ffmpeg
# reclama de codec/timestamp em vídeo baixado do YouTube, e qualquer sujeira
# que vaze pro stdout quebra o contrato com o TypeScript.
os.environ.setdefault("OPENCV_LOG_LEVEL", "ERROR")
os.environ.setdefault("OPENCV_FFMPEG_LOGLEVEL", "-8")
# Só afeta Windows (teste local): o backend MSMF falha em muito mp4 e faz o
# seek travar. No Ubuntu da VPS a variável é ignorada.
os.environ.setdefault("OPENCV_VIDEOIO_PRIORITY_MSMF", "0")

try:
    import cv2
    import numpy as np
except ImportError as e:  # pragma: no cover
    sys.stderr.write(
        f"OpenCV não encontrado ({e}). Instale com: apt-get install -y python3-opencv\n"
    )
    raise SystemExit(3)


# ---------------------------------------------------------------------------
# Modelo
# ---------------------------------------------------------------------------

# YuNet v2. É o modelo que o enunciado pede e o que acompanha o OpenCV >= 4.8.
MODELO_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)
MODELO_NOME = "face_detection_yunet_2023mar.onnx"

# YuNet v1, para OpenCV antigo.
#
# A VPS tem OpenCV 4.6 (é o que o python3-opencv do Ubuntu 24.04 entrega), e o
# FaceDetectorYN de antes do 4.8 não entende o grafo do 2023mar: ele carrega e
# só estoura no primeiro detect(), com "Layer with requested id=-1 not found in
# function 'getLayerData'". O 2022mar tem a MESMA saída (Nx15) e roda em 4.5+,
# então o fallback é transparente pro resto do código.
#
# A URL aponta pra um commit fixo de propósito: o 2022mar foi REMOVIDO do main
# do opencv_zoo, e um branch móvel aqui viraria 404 silencioso no futuro.
MODELO_ANTIGO_URL = (
    "https://github.com/opencv/opencv_zoo/raw/f7c2881434/models/"
    "face_detection_yunet/face_detection_yunet_2022mar.onnx"
)
MODELO_ANTIGO_NOME = "face_detection_yunet_2022mar.onnx"

# Menor que isto não é modelo: é ponteiro do git-lfs (~131 bytes) ou página de
# erro. Baixar o ponteiro e cacheá-lo deixaria a VPS quebrada para sempre, com
# uma mensagem de erro que não fala em download.
TAMANHO_MINIMO_MODELO = 50 * 1024


def diretorio_modelos() -> str:
    """
    Onde os .onnx ficam cacheados.

    Mesma convenção do resto do worker (ver FONTES_DIR em worker/indice.ts):
    caminho fixo na VPS, sobrescrevível por env, com queda pro temp quando o
    diretório de sistema não é gravável (dev local, container sem root).
    """
    alvo = os.environ.get("MODELOS_DIR") or "/var/lib/viral-farm/modelos"
    for candidato in (alvo, os.path.join(tempfile.gettempdir(), "viral-farm-modelos")):
        try:
            os.makedirs(candidato, exist_ok=True)
            if os.access(candidato, os.W_OK):
                return candidato
        except OSError:
            continue
    raise RuntimeError("nenhum diretório gravável para cachear o modelo")


def baixar_modelo(url: str, destino: str) -> None:
    """
    Baixa o .onnx e grava de forma atômica.

    Atômico importa porque dois jobs podem chamar isto ao mesmo tempo: gravar
    direto no destino deixaria o segundo lendo um arquivo pela metade. Escreve
    em .parcial e renomeia — os.replace é atômico dentro do mesmo filesystem.
    """
    os.makedirs(os.path.dirname(destino) or ".", exist_ok=True)
    parcial = f"{destino}.{os.getpid()}.parcial"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "viral-farm/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resposta:
            dados = resposta.read()
    except (urllib.error.URLError, OSError) as e:
        raise RuntimeError(f"falha ao baixar o modelo de {url}: {e}") from e

    if len(dados) < TAMANHO_MINIMO_MODELO:
        raise RuntimeError(
            f"o download de {url} veio com {len(dados)} bytes — isso é ponteiro "
            "do git-lfs ou página de erro, não o modelo"
        )

    try:
        with open(parcial, "wb") as f:
            f.write(dados)
        os.replace(parcial, destino)
    except OSError as e:
        raise RuntimeError(f"falha ao gravar o modelo em {destino}: {e}") from e
    finally:
        if os.path.exists(parcial):
            try:
                os.remove(parcial)
            except OSError:
                pass


def garantir_modelo(caminho: str | None, url: str, nome: str) -> str:
    """Devolve um caminho de modelo existente, baixando pro cache se preciso."""
    destino = caminho or os.path.join(diretorio_modelos(), nome)
    if os.path.isfile(destino) and os.path.getsize(destino) >= TAMANHO_MINIMO_MODELO:
        return destino
    baixar_modelo(url, destino)
    return destino


def criar_detector(caminho: str, largura: int, altura: int, conf: float, nms: float):
    """Cria o FaceDetectorYN já dimensionado para os frames da detecção."""
    # FaceDetectorYN_create é o nome do enunciado; FaceDetectorYN.create é o
    # mesmo objeto em builds mais novas. Tentamos os dois.
    fabrica = getattr(cv2, "FaceDetectorYN_create", None)
    if fabrica is None:
        fabrica = getattr(getattr(cv2, "FaceDetectorYN", None), "create", None)
    if fabrica is None:
        raise RuntimeError(
            "este OpenCV não tem FaceDetectorYN (precisa do módulo objdetect, "
            "OpenCV >= 4.5.4). Instale com: apt-get install -y python3-opencv"
        )
    return fabrica(caminho, "", (largura, altura), conf, nms, 5000)


def detector_utilizavel(detector, largura: int, altura: int) -> bool:
    """
    Roda um detect() de mentira pra saber se o par modelo/OpenCV funciona.

    O 2023mar em OpenCV < 4.8 CARREGA sem reclamar e só explode no primeiro
    detect() de verdade. Sem esta sonda, a falha apareceria no meio do vídeo,
    depois de já ter gasto minutos de CPU decodificando.
    """
    try:
        detector.detect(np.zeros((altura, largura, 3), dtype=np.uint8))
        return True
    except cv2.error:
        return False


def resolver_detector(
    caminho_pedido: str | None, largura: int, altura: int, conf: float, nms: float
):
    """
    Devolve (detector, caminho_do_modelo_usado).

    Se o usuário passou --modelo explicitamente, respeitamos a escolha e
    falhamos alto se não der: adivinhar outro modelo seria desobedecer em
    silêncio. Sem --modelo, tentamos o 2023mar e caímos pro 2022mar quando o
    OpenCV é velho demais pra ele.
    """
    if caminho_pedido:
        modelo = garantir_modelo(caminho_pedido, MODELO_URL, MODELO_NOME)
        detector = criar_detector(modelo, largura, altura, conf, nms)
        if not detector_utilizavel(detector, largura, altura):
            raise RuntimeError(
                f"o modelo {modelo} não roda neste OpenCV ({cv2.__version__}). "
                "O YuNet 2023mar exige OpenCV >= 4.8; para 4.6/4.7 use o "
                f"2022mar ({MODELO_ANTIGO_URL}) ou omita --modelo para que este "
                "script escolha sozinho."
            )
        return detector, modelo

    tentativas = [
        (MODELO_URL, MODELO_NOME),
        (MODELO_ANTIGO_URL, MODELO_ANTIGO_NOME),
    ]
    problemas: list[str] = []
    for url, nome in tentativas:
        try:
            modelo = garantir_modelo(None, url, nome)
            detector = criar_detector(modelo, largura, altura, conf, nms)
        except (RuntimeError, cv2.error) as e:
            problemas.append(f"{nome}: {e}")
            continue
        if detector_utilizavel(detector, largura, altura):
            return detector, modelo
        problemas.append(f"{nome}: incompatível com OpenCV {cv2.__version__}")
    raise RuntimeError("nenhum modelo YuNet utilizável. " + " | ".join(problemas))


# ---------------------------------------------------------------------------
# Geometria da detecção
# ---------------------------------------------------------------------------

# Largura máxima em que a detecção roda. 1 vCPU e sem GPU: detectar em 1920
# custa ~9x o de 640 (a rede é convolucional, o custo anda com a área) e não
# acha nada a mais — um rosto que ocupa 10% da tela ainda tem ~64px em 640, e
# o YuNet acha rosto a partir de ~10px. As coordenadas voltam reescaladas, e o
# consumidor nem sabe que a medição foi feita pequena.
LARGURA_DETECCAO = 640


def dimensao_deteccao(largura: int, altura: int, largura_max: int) -> tuple[int, int]:
    """
    Tamanho em que a detecção roda, múltiplo de 32.

    Múltiplo de 32 porque o YuNet empilha strides 8/16/32: com dimensão que não
    fecha a conta, versões antigas do OpenCV estouram em 'parseShape'. O
    arredondamento distorce a proporção em poucos por cento — irrelevante pra
    detecção, e sem efeito nenhum na saída, porque reescalamos x e y por
    fatores separados e exatos.

    A ESCALA nunca passa de 1.0 (vídeo menor que o alvo não é ampliado), mas o
    arredondamento pra cima ainda pode esticar um lado em até 31px. É barato e
    não atrapalha; o que importa é não reprocessar 1920 de largura.
    """
    if largura <= 0 or altura <= 0:
        raise ValueError("dimensões de vídeo inválidas")

    escala = min(1.0, largura_max / float(largura))
    larg = max(32, int(round(largura * escala / 32.0)) * 32)
    alt = max(32, int(round(altura * escala / 32.0)) * 32)
    return larg, alt


def frontalidade(f) -> float:
    """
    O quanto este rosto está VIRADO PARA A CÂMERA, de 0 (perfil) a 1 (de frente).

    POR QUE ISTO PASSOU A EXISTIR

    O reenquadramento seguia o maior rosto do quadro, e num plano
    over-the-shoulder — dois personagens conversando, um de costas em primeiro
    plano — o maior rosto é justamente o que NÃO é o assunto. Extraindo o frame
    do vídeo renderizado dá para ver o erro inteiro: o crop fixo mostrava a
    atriz em foco, e o rastreamento tinha ido atrás da nuca escura e desfocada
    do outro ator, que era maior. Tamanho não é importância.

    COMO SE MEDE

    O YuNet entrega cinco landmarks, e os dois olhos bastam. De frente, eles
    ficam separados por perto de 45% da largura da caixa; de perfil, um se
    esconde atrás do nariz e a separação despenca para menos de 15%. A razão
    entre a separação e a largura é a medida, esticada para que 0,45 vire 1.

    Cada linha do YuNet é [x, y, w, h, olho_dir(x,y), olho_esq(x,y), nariz(x,y),
    boca_dir(x,y), boca_esq(x,y), score] — daí os índices.
    """
    largura_caixa = float(f[2])
    if largura_caixa <= 0:
        return 0.0
    separacao = abs(float(f[4]) - float(f[6]))
    return max(0.0, min(1.0, (separacao / largura_caixa) / 0.45))


def nitidez(quadro, x: int, y: int, w: int, h: int) -> float:
    """
    O quanto este rosto está EM FOCO — variância do Laplaciano na caixa.

    Serve à mesma pergunta da frontalidade, pelo outro lado: numa composição com
    profundidade de campo, o assunto está nítido e o primeiro plano borrado. O
    valor é cru e só faz sentido COMPARADO com os outros rostos do mesmo frame:
    a variância absoluta depende de iluminação e textura, mas dentro de um mesmo
    quadro o rosto em foco vence o desfocado com folga.

    Custa pouco porque roda só na caixa do rosto, não no quadro inteiro.
    """
    if w <= 1 or h <= 1:
        return 0.0
    recorte = quadro[y:y + h, x:x + w]
    if recorte.size == 0:
        return 0.0
    cinza = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(cinza, cv2.CV_64F).var())


def extrair_rostos(
    faces, escala_x: float, escala_y: float, largura: int, altura: int,
    quadro=None,
) -> list[dict]:
    """
    Converte a matriz Nx15 do YuNet em caixas na escala do vídeo original.

    Cada linha é [x, y, w, h, 10 valores de landmark, score]. Os landmarks não
    saem no JSON — o consumidor não sabe o que fazer com dez números soltos —
    mas viram `frontal`, que é a pergunta que eles respondem bem.
    """
    if faces is None or len(faces) == 0:
        return []

    rostos: list[dict] = []
    for f in faces:
        x = float(f[0]) * escala_x
        y = float(f[1]) * escala_y
        w = float(f[2]) * escala_x
        h = float(f[3]) * escala_y

        # O YuNet devolve caixa estourando a borda quando o rosto está cortado
        # pelo quadro. Sem o clamp, o consumidor calcularia um centro fora do
        # vídeo e a janela sairia da imagem.
        x0 = max(0, min(largura, int(round(x))))
        y0 = max(0, min(altura, int(round(y))))
        x1 = max(0, min(largura, int(round(x + w))))
        y1 = max(0, min(altura, int(round(y + h))))
        if x1 - x0 <= 0 or y1 - y0 <= 0:
            continue

        # A nitidez é medida no quadro PEQUENO (o que foi detectado), então as
        # coordenadas voltam para aquela escala. Medir no original exigiria
        # carregar o quadro grande aqui só para isso.
        foco = 0.0
        if quadro is not None:
            foco = nitidez(
                quadro,
                max(0, int(round(float(f[0])))),
                max(0, int(round(float(f[1])))),
                max(0, int(round(float(f[2])))),
                max(0, int(round(float(f[3])))),
            )

        rostos.append(
            {
                "x": x0,
                "y": y0,
                "w": x1 - x0,
                "h": y1 - y0,
                "conf": round(float(f[14]), 3),
                "frontal": round(frontalidade(f), 3),
                "nitidez": round(foco, 1),
            }
        )

    # Maior primeiro. Continua sendo a ordem do JSON porque ela é objetiva e
    # todo o histórico de medição deste trabalho se apoia nela; QUEM SEGUIR é
    # decisão de quem consome, agora com `frontal` e `nitidez` para decidir
    # melhor do que "o maior ganha".
    rostos.sort(key=lambda r: r["w"] * r["h"], reverse=True)
    return rostos


# ---------------------------------------------------------------------------
# Amostragem
# ---------------------------------------------------------------------------


def amostrar(
    cap, detector, inicio: float, fim: float, fps_amostra: float,
    largura: int, altura: int, larg_det: int, alt_det: int, fps_video: float,
) -> list[dict]:
    """
    Percorre o trecho e detecta nos instantes da grade.

    ESTRATÉGIA: UM seek até `inicio`, depois leitura SEQUENCIAL com grab(),
    chamando retrieve() só nos instantes de amostra.

    Por que não um cap.set(POS_MSEC) por amostra: seek não pula pro quadro
    pedido, ele pula pro keyframe anterior. Vídeo do YouTube costuma ter GOP
    longo (keyframe a cada 4–10s), então cada seek obriga o decoder a engolir
    dezenas ou centenas de quadros — e ainda descarta o estado a cada chamada.
    Com fps=2 sobre um trecho de 45s são 90 seeks; sequencialmente o mesmo
    trecho custa ~1350 quadros decodificados UMA vez. Sequencial ganha com
    folga, e a margem cresce quanto maior o fps de amostragem.

    Por que grab() e não read(): grab() decodifica e para por aí; retrieve()
    é que faz a conversão pra BGR e aloca o ndarray. Como só 1 em cada ~15
    quadros vira amostra, pular o retrieve nos outros 14 economiza a conversão
    de cor e a alocação — a parte do custo que é puro desperdício aqui.
    """
    cap.set(cv2.CAP_PROP_POS_MSEC, inicio * 1000.0)

    # Onde o seek REALMENTE parou. Como ele cai no keyframe, o ponto de partida
    # costuma ser antes de `inicio`; contar o tempo a partir de `inicio` sairia
    # com todas as amostras deslocadas.
    pos_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
    if pos_ms and pos_ms > 0:
        t_base = pos_ms / 1000.0
    else:
        # Backend que não reporta posição: assume que o seek foi exato. Pior
        # caso, as amostras saem deslocadas por menos de um GOP.
        t_base = inicio

    def alvo(i: int) -> float:
        """
        Instante da i-ésima amostra, por MULTIPLICAÇÃO.

        Acumular (`t += passo`) parece igual e não é: o erro de ponto flutuante
        soma a cada volta. Num trecho de 45s a 2 amostras/s isso desloca as
        últimas amostras e chega a inventar uma amostra extra colada em `fim`,
        fora do intervalo [inicio, fim). Indexar não acumula erro nenhum.
        """
        return inicio + i / fps_amostra

    # A grade é gerada sob demanda, não materializada numa lista. `fim` pode ser
    # infinito (--fim omitido em container que não reporta contagem de quadros),
    # e pré-montar a lista nesse caso encheria a RAM até o worker morrer — a
    # parada real vem do grab() devolvendo falso no fim do vídeo.
    limite = fim - 1e-9

    # Meio quadro de tolerância: aceita o quadro imediatamente anterior ao alvo
    # quando ele está mais perto do alvo do que o seguinte.
    meio_quadro = 0.5 / fps_video

    amostras: list[dict] = []
    idx = 0
    n = 0
    # `idx == 0` garante ao menos uma amostra mesmo num trecho degenerado.
    while idx == 0 or alvo(idx) < limite:
        if not cap.grab():
            break  # fim do vídeo antes do fim da grade
        t_quadro = t_base + n / fps_video
        n += 1

        if t_quadro + meio_quadro < alvo(idx):
            continue

        ok, quadro = cap.retrieve()
        if not ok or quadro is None:
            continue

        pequeno = cv2.resize(quadro, (larg_det, alt_det), interpolation=cv2.INTER_AREA)
        _, faces = detector.detect(pequeno)
        rostos = extrair_rostos(
            faces, largura / float(larg_det), altura / float(alt_det),
            largura, altura, pequeno,
        )

        amostras.append({"t": round(alvo(idx), 3), "rostos": rostos})
        idx += 1

        # Um mesmo quadro pode cobrir vários alvos quando o fps de amostragem
        # passa do fps do vídeo. Reaproveita a detecção em vez de detectar de
        # novo no mesmo pixel.
        while alvo(idx) < limite and alvo(idx) <= t_quadro:
            amostras.append({"t": round(alvo(idx), 3), "rostos": list(rostos)})
            idx += 1

    return amostras


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Detecta rostos amostrados ao longo de um trecho de vídeo.",
    )
    p.add_argument("--video", required=True, help="caminho do vídeo de entrada")
    p.add_argument("--inicio", type=float, default=0.0, help="segundo inicial")
    p.add_argument(
        "--fim", type=float, default=None,
        help="segundo final (padrão: fim do vídeo)",
    )
    p.add_argument(
        "--fps", type=float, default=2.0,
        help="amostras por segundo (padrão: 2)",
    )
    p.add_argument(
        "--modelo", default=None,
        help="caminho do .onnx do YuNet (padrão: baixa e cacheia)",
    )
    p.add_argument(
        "--conf", type=float, default=0.6,
        help="confiança mínima do rosto (padrão: 0.6)",
    )
    p.add_argument(
        "--nms", type=float, default=0.3,
        help="limiar de NMS entre caixas (padrão: 0.3)",
    )
    p.add_argument(
        "--largura-deteccao", type=int, default=LARGURA_DETECCAO,
        help=f"largura máxima da detecção (padrão: {LARGURA_DETECCAO})",
    )
    p.add_argument(
        "--threads", type=int, default=1,
        help="threads do OpenCV (padrão: 1, para VPS de 1 vCPU)",
    )
    args = p.parse_args(argv)

    if args.fps <= 0 or args.fps > 60:
        sys.stderr.write("--fps precisa estar entre 0 (exclusivo) e 60\n")
        return 2
    if args.largura_deteccao < 32:
        sys.stderr.write("--largura-deteccao precisa ser >= 32\n")
        return 2
    if not os.path.isfile(args.video):
        sys.stderr.write(f"vídeo não encontrado: {args.video}\n")
        return 4

    # Numa máquina de 1 núcleo, mais de uma thread só adiciona sincronização:
    # não há segundo núcleo pra usar, e o worker ainda divide a CPU com ffmpeg.
    try:
        cv2.setNumThreads(max(1, args.threads))
    except cv2.error:
        pass

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        sys.stderr.write(f"não consegui abrir o vídeo: {args.video}\n")
        return 4

    try:
        largura = int(round(cap.get(cv2.CAP_PROP_FRAME_WIDTH)))
        altura = int(round(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
        fps_video = cap.get(cv2.CAP_PROP_FPS)
        quadros = cap.get(cv2.CAP_PROP_FRAME_COUNT)

        if largura <= 0 or altura <= 0:
            sys.stderr.write(
                f"o vídeo não reportou dimensões válidas ({largura}x{altura}); "
                "arquivo corrompido ou sem trilha de vídeo\n"
            )
            return 4

        # Container mentiroso (comum em stream remuxado) reporta fps 0 ou
        # absurdo. 30 é chute conservador e só afeta a precisão do instante da
        # amostra, não a detecção.
        if not fps_video or fps_video <= 0 or fps_video > 240:
            fps_video = 30.0

        duracao = quadros / fps_video if quadros and quadros > 0 else None

        inicio = max(0.0, args.inicio)
        fim = args.fim if args.fim is not None else (duracao if duracao else None)
        if fim is None:
            # Sem contagem de quadros confiável não dá pra saber onde acaba;
            # amostramos até o decoder dizer que acabou.
            fim = float("inf")
        if duracao:
            fim = min(fim, duracao)
        if fim <= inicio:
            sys.stderr.write(
                f"trecho vazio: --inicio {inicio} não é menor que --fim {fim}\n"
            )
            return 2

        larg_det, alt_det = dimensao_deteccao(largura, altura, args.largura_deteccao)

        try:
            detector, _modelo = resolver_detector(
                args.modelo, larg_det, alt_det, args.conf, args.nms
            )
        except (RuntimeError, ValueError, cv2.error) as e:
            sys.stderr.write(f"{e}\n")
            return 3

        amostras = amostrar(
            cap, detector, inicio, fim, args.fps,
            largura, altura, larg_det, alt_det, fps_video,
        )
    except cv2.error as e:
        sys.stderr.write(f"erro do OpenCV lendo {args.video}: {e}\n")
        return 4
    finally:
        cap.release()

    if not amostras:
        sys.stderr.write(
            f"não consegui ler nenhum quadro de {args.video} "
            f"no trecho {inicio}–{fim}\n"
        )
        return 4

    # Uma impressão só, no fim: até aqui qualquer falha saiu por stderr com
    # stdout intacto e vazio, que é o que o contrato promete.
    json.dump(
        {"largura": largura, "altura": altura, "amostras": amostras},
        sys.stdout,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
