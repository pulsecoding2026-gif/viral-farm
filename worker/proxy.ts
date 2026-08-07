import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { supabase } from "./fila";

/**
 * Proxy do vídeo fonte — a cópia leve que o editor não-destrutivo abre no
 * navegador.
 *
 * O fonte em alta só existe na VPS (`/var/lib/viral-farm/fontes`), e a VPS não
 * expõe HTTP: o navegador não tem como alcançá-lo. Sem proxy, o editor só
 * consegue tocar o MP4 já renderizado — ou seja, só dá pra reeditar o que já
 * foi cortado, que é o contrário de edição não-destrutiva.
 *
 * O proxy serve SÓ pra ver e marcar tempo. O render final continua saindo do
 * original em alta, na VPS — o que o dono baixa nunca é este arquivo.
 */

/** Altura máxima do proxy. Acima disso o ganho é invisível numa timeline. */
const ALTURA = 480;

export async function gerarProxy(
  videoFonte: string,
  dir: string,
  sinal?: AbortSignal,
): Promise<string> {
  const saida = path.join(dir, "proxy.mp4");

  await run(
    bin.ffmpeg(),
    [
      "-i", videoFonte,
      // Mapa explícito porque o fonte do YouTube às vezes traz capa embutida
      // como um segundo stream de vídeo. O "?" no áudio é pro fonte mudo não
      // derrubar a geração inteira.
      "-map", "0:v:0",
      "-map", "0:a:0?",
      // min(): nunca AUMENTA um fonte que já é menor que 480 — upscale só
      // gastaria banda sem devolver um pixel de detalhe. trunc(ih/2)*2 força
      // altura par, que o yuv420p exige. A vírgula vai escapada porque, solta,
      // ela separaria filtros no grafo.
      "-vf", `scale=-2:min(${ALTURA}\\,trunc(ih/2)*2)`,
      // O fonte pode vir em 10 bits ou 4:2:2 (yuv420p10le, yuv422p). Navegador
      // não decodifica esses perfis por hardware — e alguns nem por software.
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "veryfast",
      // Bitrate ALVO, não qualidade alvo (crf): aqui o que importa é o arquivo
      // ser previsivelmente pequeno. Com crf, uma cena agitada inflaria o
      // proxy justamente onde a fidelidade não faz diferença nenhuma.
      "-b:v", "800k",
      "-maxrate", "1000k",
      "-bufsize", "1600k",
      // O GOP curto é a razão de existir deste encode. O editor busca o tempo
      // todo (arrastar alça, pular pro corte, revisar o mesmo trecho), e cada
      // seek decodifica desde o keyframe anterior: com o GOP padrão (250
      // frames, ~8s) cada arrasto trava. 30 frames deixa o pior caso em ~1s.
      "-g", "30",
      "-c:a", "aac",
      // Mono 64k: o áudio aqui serve pra achar onde a fala começa, não pra
      // ouvir. Estéreo custaria o dobro do bitrate sem mudar essa decisão.
      "-ac", "1",
      "-b:a", "64k",
      // Sem faststart o índice do MP4 fica no fim do arquivo e o navegador
      // precisa baixar o vídeo inteiro antes de mostrar o primeiro frame.
      "-movflags", "+faststart",
      "-y", saida,
    ],
    { timeoutMs: 15 * 60_000, sinal },
  );

  return saida;
}

/**
 * Sobe o proxy e devolve a URL pública que o editor vai usar no <video>.
 *
 * Mesmo bucket dos cortes: o proxy tem exatamente a mesma vida útil e as
 * mesmas regras de acesso que eles, e o `on delete cascade` da análise já
 * limpa a pasta inteira. Caminho fixo por análise (nada de uuid) porque só
 * existe um fonte por análise — regerar tem que SUBSTITUIR, não acumular.
 */
export async function subirProxy(
  analiseId: string,
  userId: string,
  arquivo: string,
): Promise<string> {
  const caminho = `${userId}/${analiseId}/proxy.mp4`;
  const bytes = await fs.readFile(arquivo);

  const { error } = await supabase()
    .storage.from("cortes")
    .upload(caminho, bytes, { contentType: "video/mp4", upsert: true });

  if (error) throw new Error(`Upload do proxy falhou: ${error.message}`);

  return supabase().storage.from("cortes").getPublicUrl(caminho).data.publicUrl;
}
