import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

/**
 * Webhook do TikTok for Developers.
 *
 * O TikTok avisa aqui sobre eventos das contas conectadas — publicação
 * concluída, publicação rejeitada, autorização revogada. Ele não espera nada
 * além de 200 e um corpo curto: qualquer coisa diferente disso, ele
 * reenvia o evento e depois desativa a URL.
 *
 * Por isso a regra deste arquivo: NUNCA processar de forma síncrona. Só
 * validar, registrar e responder. Quando houver o que fazer com o evento,
 * ele entra numa fila — igual às análises.
 */

type EventoTikTok = {
  client_key?: string;
  event?: string;
  create_time?: number;
  user_openid?: string;
  content?: string;
};

/**
 * Confere a assinatura do TikTok (cabeçalho `TikTok-Signature`), no formato
 * `t=<timestamp>,s=<hmac>`, onde o hmac é sha256 de "<t>.<corpo>" com o
 * client secret.
 *
 * Sem `TIKTOK_CLIENT_SECRET` configurado, aceitamos o evento e registramos o
 * aviso — é o estado durante a configuração inicial no portal, quando o
 * TikTok testa a URL antes mesmo de o app ter segredo em produção.
 */
function assinaturaConfere(assinatura: string | null, corpo: string): boolean {
  const segredo = process.env.TIKTOK_CLIENT_SECRET;
  if (!segredo) {
    console.warn(
      "[tiktok] TIKTOK_CLIENT_SECRET não configurado — evento aceito sem verificação.",
    );
    return true;
  }
  if (!assinatura) return false;

  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = partes.t;
  const s = partes.s;
  if (!t || !s) return false;

  // Janela de 5 minutos: barra reenvio de evento antigo capturado por terceiro.
  const idade = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(idade) || idade > 300) return false;

  const esperado = createHmac("sha256", segredo)
    .update(`${t}.${corpo}`)
    .digest("hex");

  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(s, "utf8");
  // timingSafeEqual exige mesmo tamanho e compara sem vazar tempo.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const corpo = await req.text();

  if (!assinaturaConfere(req.headers.get("TikTok-Signature"), corpo)) {
    return Response.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  let evento: EventoTikTok = {};
  try {
    evento = JSON.parse(corpo) as EventoTikTok;
  } catch {
    // Corpo não-JSON ainda merece 200: o TikTok usa POST vazio pra testar a
    // URL no portal, e responder erro faria a validação falhar.
    console.warn("[tiktok] corpo não é JSON:", corpo.slice(0, 200));
    return Response.json({ ok: true });
  }

  console.log(
    `[tiktok] evento=${evento.event ?? "?"} openid=${evento.user_openid ?? "?"}`,
  );

  // Quando as publicações estiverem ligadas, é aqui que o evento vira
  // atualização de status do post. Por ora, registrar e confirmar basta.

  return Response.json({ ok: true });
}

/**
 * O portal do TikTok bate um GET no "Test URL" antes de aceitar o endereço.
 * Responder 200 aqui é o que faz o botão ficar verde.
 */
export async function GET() {
  return Response.json({ ok: true, servico: "viral-farm", webhook: "tiktok" });
}
