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

/**
 * O vídeo é longo demais pra caber num proxy útil.
 *
 * Classe própria pra quem chama distinguir "não deu" de "não cabe": o
 * primeiro merece log de erro, o segundo é uma decisão do sistema e vira só
 * um aviso.
 */
export class ProxyNaoCabe extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ProxyNaoCabe";
  }
}

/**
 * Teto de tamanho do proxy, em megabytes.
 *
 * O bitrate fixo de 800k parecia razoável até o primeiro vídeo de 20 minutos:
 * 120 MB, e o Storage recusou com "The object exceeded the maximum allowed
 * size". O encode tinha funcionado; morreu no upload, depois de gastar sete
 * minutos de CPU.
 *
 * O erro de fundo era tratar bitrate como constante quando o que precisa ser
 * constante é o ARQUIVO. Um podcast de duas horas geraria 700 MB, e nenhum
 * limite de bucket resolveria isso pra sempre.
 */
const TETO_MB = 40;

/** Piso e teto do bitrate, em kbps. */
const BITRATE_MIN = 220;
const BITRATE_MAX = 900;

/**
 * Bitrate que faz o proxy caber no teto, dada a duração.
 *
 * Vídeo curto usa o teto de qualidade; vídeo longo aperta até o piso. Abaixo
 * do piso não vale a pena: o proxy deixaria de servir pra reconhecer a cena,
 * que é a única coisa que ele precisa fazer.
 */
export function bitrateDoProxy(duracao_s: number): number {
  if (!Number.isFinite(duracao_s) || duracao_s <= 0) return BITRATE_MAX;
  // Desconta o áudio (64k) do orçamento: ele também ocupa o arquivo.
  const kbitsDisponiveis = (TETO_MB * 8 * 1024) / duracao_s - 64;
  return Math.round(
    Math.max(BITRATE_MIN, Math.min(BITRATE_MAX, kbitsDisponiveis)),
  );
}

/**
 * Resolução e cadência caem conforme o vídeo cresce.
 *
 * É o truque clássico de proxy: com metade dos quadros e menos pixels, o
 * mesmo bitrate rende muito mais. Um proxy não precisa ser bonito — precisa
 * deixar reconhecer a cena e buscar rápido.
 *
 * 15 fps ainda é fluido o bastante pra achar o frame certo; abaixo disso o
 * arrasto na linha do tempo começa a parecer travado.
 */
export function perfilDoProxy(duracao_s: number): { altura: number; fps: number } {
  if (duracao_s <= 12 * 60) return { altura: 480, fps: 30 };
  if (duracao_s <= 35 * 60) return { altura: 360, fps: 20 };
  return { altura: 270, fps: 15 };
}

/**
 * O proxy caberia no teto do Storage?
 *
 * O limite é do PROJETO Supabase, não do bucket — `updateBucket` recusa subir
 * além dele. Então não adianta tentar e torcer: um vídeo longo demais gasta
 * minutos de CPU pra morrer no upload, que foi exatamente o que aconteceu com
 * o primeiro vídeo de 20 minutos.
 *
 * Quando não cabe, é melhor não gerar: o editor já trata a ausência de proxy
 * com uma mensagem clara ("só dá pra editar dentro do corte renderizado").
 * Gastar sete minutos de encode pra falhar no fim não ajuda ninguém.
 */
export function proxyCabe(duracao_s: number): boolean {
  if (!Number.isFinite(duracao_s) || duracao_s <= 0) return true;
  const kbps = bitrateDoProxy(duracao_s) + 64;
  const mb = (kbps * duracao_s) / 8 / 1024;
  return mb <= TETO_MB * 1.15;
}

async function duracaoDoVideo(arquivo: string): Promise<number> {
  try {
    const saida = await run(
      bin.ffprobe(),
      ["-v", "error", "-show_entries", "format=duration",
       "-of", "csv=p=0", arquivo],
      { timeoutMs: 30_000 },
    );
    return Number(saida.trim()) || 0;
  } catch {
    // Sem duração, o bitrate máximo é o palpite seguro pra vídeo curto — e
    // vídeo curto é o caso em que ela falha menos.
    return 0;
  }
}

export async function gerarProxy(
  videoFonte: string,
  dir: string,
  sinal?: AbortSignal,
): Promise<string> {
  const saida = path.join(dir, "proxy.mp4");
  const duracao = await duracaoDoVideo(videoFonte);

  if (!proxyCabe(duracao)) {
    throw new ProxyNaoCabe(
      `Vídeo de ${Math.round(duracao / 60)} min não cabe no teto de ` +
        `${TETO_MB} MB do Storage nem no bitrate mínimo. Sem proxy: o editor ` +
        `fica limitado ao corte já renderizado.`,
    );
  }

  const kbps = bitrateDoProxy(duracao);
  const perfil = perfilDoProxy(duracao);

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
      "-vf", `scale=-2:min(${perfil.altura}\\,trunc(ih/2)*2)`,
      "-r", String(perfil.fps),
      // O fonte pode vir em 10 bits ou 4:2:2 (yuv420p10le, yuv422p). Navegador
      // não decodifica esses perfis por hardware — e alguns nem por software.
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "veryfast",
      // Bitrate ALVO, não qualidade alvo (crf): aqui o que importa é o arquivo
      // ser previsivelmente pequeno. Com crf, uma cena agitada inflaria o
      // proxy justamente onde a fidelidade não faz diferença nenhuma.
      "-b:v", `${kbps}k`,
      "-maxrate", `${Math.round(kbps * 1.25)}k`,
      "-bufsize", `${Math.round(kbps * 2)}k`,
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
