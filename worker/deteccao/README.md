# Detecção de rostos

`rostos.py` mede onde estão os rostos ao longo de um trecho de vídeo. Serve ao
reenquadramento 16:9 → 9:16: em vez de crop central fixo, o corte segue quem
está em cena.

Este script só **detecta** e devolve números crus. Suavização, escolha de quem
seguir e movimento da janela são de quem consome.

## Instalar

```bash
apt-get install -y python3-opencv
```

Traz OpenCV com o módulo `objdetect` (o `FaceDetectorYN`) e o `numpy`. Não use
`pip install opencv-python` na VPS: puxa um wheel de ~90 MB com uma segunda
cópia de tudo, sem ganho nenhum aqui.

## Usar

```bash
python3 worker/deteccao/rostos.py --video CAMINHO --inicio 12.5 --fim 58.0 --fps 2
```

| Flag | Padrão | O quê |
| --- | --- | --- |
| `--video` | (obrigatório) | arquivo de entrada |
| `--inicio` | `0` | segundo inicial |
| `--fim` | fim do vídeo | segundo final |
| `--fps` | `2` | amostras por segundo |
| `--modelo` | baixa e cacheia | caminho de um `.onnx` do YuNet |
| `--conf` | `0.6` | confiança mínima do rosto |
| `--nms` | `0.3` | limiar de NMS entre caixas |
| `--largura-deteccao` | `640` | largura em que a detecção roda |
| `--threads` | `1` | threads do OpenCV |

Saída em stdout, **uma linha**:

```json
{"largura":1920,"altura":1080,"amostras":[{"t":12.5,"rostos":[{"x":820,"y":300,"w":180,"h":220,"conf":0.94}]}]}
```

- `largura`/`altura` são do vídeo **original**, e as caixas estão nessa mesma
  escala — a detecção roda menor, mas as coordenadas voltam reescaladas.
- `rostos` vem ordenado por **área, maior primeiro**.
- Amostra sem rosto devolve `"rostos": []` e **não** é omitida: o consumidor
  precisa distinguir "não tinha ninguém aqui" de "não medi aqui".

Erro → mensagem em stderr e código != 0 (`2` uso, `3` modelo, `4` vídeo).
Nunca sai JSON parcial: o resultado é montado inteiro e impresso de uma vez.

## Modelo

Baixado sob demanda e cacheado em `$MODELOS_DIR`, que na VPS é
`/var/lib/viral-farm/modelos` (cai pro diretório temporário se não for
gravável). A primeira execução baixa ~230 KB; as seguintes reusam o arquivo.
A gravação é atômica, então dois jobs simultâneos não se atrapalham.

**Cuidado com a versão do OpenCV.** O `python3-opencv` do Ubuntu 24.04 é o
OpenCV 4.6, e o `FaceDetectorYN` de antes do 4.8 não entende o grafo do
`face_detection_yunet_2023mar.onnx` (YuNet v2): ele carrega sem reclamar e só
estoura no primeiro `detect()`, com `Layer with requested id=-1 not found`.

O script contorna sozinho: cria o detector, roda uma detecção de sonda num
quadro em branco e, se ela falhar, cai pro `face_detection_yunet_2022mar.onnx`
(YuNet v1), que tem a mesma saída e roda em 4.5+. A sonda existe para a falha
aparecer **antes** de gastar minutos de CPU decodificando.

Se você passar `--modelo` explicitamente, não há fallback — a escolha é
respeitada e o erro é alto, em vez de trocar seu modelo em silêncio.

Para pré-baixar na instalação, sem esperar o primeiro job:

```bash
mkdir -p /var/lib/viral-farm/modelos
curl -fsSL -o /var/lib/viral-farm/modelos/face_detection_yunet_2023mar.onnx \
  https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
```

## Custo

Estimativa para 1080p numa VPS de 1 vCPU com `--fps 2`, **na ordem de 10–20 s
por minuto de vídeo** (~0,2–0,3x do tempo real). Um trecho de 45 s sai em
~10 s. Não foi medido na VPS — meça antes de assumir o número:

```bash
time python3 worker/deteccao/rostos.py --video fonte.mp4 --inicio 0 --fim 60 > /dev/null
```

O grosso do custo é **decodificação**, não inferência — por isso o script lê
sequencialmente com `grab()` e só chama `retrieve()` nos instantes de amostra.
As três decisões que seguram o custo:

1. **Detecta em 640 px de largura, não em 1920.** A rede é convolucional, o
   custo anda com a área: 1920 custaria ~9x e não acharia nada a mais.
2. **Um `seek` só, no início, depois leitura sequencial.** `seek` não pula pro
   quadro pedido, pula pro keyframe anterior — e vídeo do YouTube tem GOP longo
   (keyframe a cada 4–10 s). Um `seek` por amostra faria o decoder engolir
   dezenas de quadros a cada chamada: num trecho de 45 s a 2 amostras/s são 90
   seeks contra ~1350 quadros decodificados **uma vez**. Sequencial ganha com
   folga, e a margem cresce com o `--fps`.
3. **`--threads 1`.** Com um núcleo só, mais threads é só sincronização — e o
   worker ainda divide a CPU com o ffmpeg.

Dobrar `--fps` não dobra o custo (a decodificação é a mesma; só cresce a
inferência), mas `--fps 1` já costuma bastar: rosto não salta de lugar em
meio segundo.

## Testar

Sem vídeo à mão, dá pra gerar um com rosto sintético? Não — YuNet quer rosto de
verdade. Use um corte real já baixado pelo worker. Verificações rápidas:

```bash
# contrato: uma linha, JSON válido, chaves certas
python3 worker/deteccao/rostos.py --video fonte.mp4 --inicio 0 --fim 10 | python3 -m json.tool | head -20

# stdout tem que ficar VAZIO no erro
python3 worker/deteccao/rostos.py --video /nao/existe.mp4 > saida.json; echo "código: $?"; wc -c saida.json

# grade de amostras: --fps 2 em 10 s tem que dar 20 amostras
python3 worker/deteccao/rostos.py --video fonte.mp4 --inicio 0 --fim 10 --fps 2 \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['amostras']), [a['t'] for a in d['amostras']][:5])"

# quantas amostras acharam alguém
python3 worker/deteccao/rostos.py --video fonte.mp4 --inicio 0 --fim 30 \
  | python3 -c "import json,sys; a=json.load(sys.stdin)['amostras']; print(sum(1 for x in a if x['rostos']), 'de', len(a))"
```

Conferir a olho se as caixas caem no lugar (precisa de `ffmpeg`):

```bash
python3 worker/deteccao/rostos.py --video fonte.mp4 --inicio 12 --fim 13 --fps 1 \
  | python3 -c "
import json,sys
r = json.load(sys.stdin)['amostras'][0]['rostos']
print('drawbox=' + ':'.join(str(v) for v in (r[0]['x'], r[0]['y'], r[0]['w'], r[0]['h'])) + ':red:3' if r else 'sem rosto')"
# use o filtro impresso: ffmpeg -ss 12 -i fonte.mp4 -frames:v 1 -vf "drawbox=..." conferir.png
```
