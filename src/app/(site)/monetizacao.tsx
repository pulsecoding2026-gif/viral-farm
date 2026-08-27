import Link from "next/link";
import {
  ArrowRight,
  CurrencyCircleDollar,
  Handshake,
  Megaphone,
  Package,
  Info,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Onde o vídeo curto vira dinheiro.
 *
 * NENHUM valor de ganho aparece aqui, e é decisão, não esquecimento: o
 * produto não tem usuário e nunca rodou uma análise, então qualquer cifra de
 * faturamento seria inventada. Promessa de renda também é o tipo de alegação
 * que gera problema jurídico e pedido de reembolso.
 *
 * O que a seção faz em vez disso:
 *   1. lista os caminhos REAIS de monetização de vídeo curto — são programas
 *      públicos das plataformas, fato verificável, não promessa nossa;
 *   2. mostra a aritmética do próprio plano (mensalidade ÷ análises), que é
 *      número nosso e conferível.
 *
 * Se um dia houver dado real de usuário, ele entra aqui — com fonte.
 */

const CAMINHOS = [
  {
    icone: CurrencyCircleDollar,
    titulo: "Fundo das plataformas",
    texto:
      "TikTok, YouTube Shorts e Reels pagam por desempenho. Cada um tem regra própria de elegibilidade, e todos cobram a mesma entrada: publicar sem falhar. Canal de cortes de GTA posta todo dia sem precisar de pauta — o material já existe.",
    cor: "from-emerald-500 to-teal-600",
  },
  {
    icone: Handshake,
    titulo: "Afiliado de games",
    texto:
      "Gift card, conta de jogo, cadeira, headset, mod. O público de GTA compra o que vê no vídeo, e link de afiliado paga por venda — não por seguidor. Quem publica mais testa mais oferta e acha a que converte.",
    cor: "from-orange-500 to-amber-600",
  },
  {
    icone: Megaphone,
    titulo: "Servidor de RP e publicidade",
    texto:
      "Servidor de roleplay vive de gente entrando, e paga por divulgação. Marca de periférico contrata alcance previsível, não pico. Um canal que entrega toda semana vale mais que um que estourou uma vez.",
    cor: "from-violet-500 to-purple-600",
  },
  {
    icone: Package,
    titulo: "O canal como ativo",
    texto:
      "Um canal com audiência é vendável, alugável e vira porta para produto próprio. E o timing importa: público construído antes de 19 de novembro custa muito menos que o construído depois, quando todo mundo estiver postando.",
    cor: "from-sky-500 to-blue-600",
  },
];

/**
 * Custo por análise, derivado da tabela de planos. Se os valores mudarem em
 * planos.tsx, estes precisam mudar junto — por isso os números vivem aqui
 * calculados, e não escritos à mão.
 */
const PLANOS_CUSTO = [
  { nome: "Lite", mensal: 59.9, analises: 60 },
  { nome: "Creator", mensal: 99.9, analises: 150, destaque: true },
  { nome: "Viral", mensal: 149.9, analises: 300 },
];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Monetizacao() {
  // `ceu-miami` no lugar do #060609 chapado: preto com uma brasa de pôr do sol
  // ao fundo, em vez de uma chapa lisa. Ver a classe em gta-tokens.css.
  return (
    <section id="monetizacao" className="ceu-miami border-y border-zinc-800/60">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[50ch] text-center">
          <span className="placa inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-orange-500">
            Monetização
          </span>
          {/* Sem `italic`: Archivo Black não tem itálico e o navegador
              simularia inclinando, o que engrossa e suja a letra. A ênfase
              vem do rosa, que é o acento único da seção. */}
          <h2 className="titulo-letreiro mt-5 text-2xl leading-[1.05] sm:text-4xl">
            Onde isso vira <span className="acento-rosa">dinheiro</span>
          </h2>
          {/*
            O gargalo aqui é VOLUME, e é isso que amarra a seção ao produto.
            Todo caminho de monetização de curto paga por constância — e quem
            edita na mão não sustenta uma postagem por dia por três meses. É
            exatamente o trabalho que a ferramenta tira da frente, então dizer
            o gargalo em voz alta é vender sem prometer resultado.
          */}
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Nenhum desses caminhos paga por um vídeo bom. Todos pagam por{" "}
            <b className="font-medium text-zinc-200">volume constante</b> — e é
            aí que quem edita na mão desiste no primeiro mês.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {CAMINHOS.map((c) => {
            const Icone = c.icone;
            return (
              <div
                key={c.titulo}
                className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.cor} text-white`}
                >
                  <Icone size={19} weight="fill" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-50">{c.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                    {c.texto}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* A conta que justifica o plano — números nossos, conferíveis. */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-6 py-5 text-center">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-50">
              O que cada corte custa
            </h3>
            <p className="mx-auto mt-1.5 max-w-[54ch] text-sm leading-relaxed text-zinc-500">
              Uma análise devolve até 8 cortes. Dividindo a mensalidade pelo
              número de análises do plano, dá pra ver o custo real de cada
              vídeo que sai daqui.
            </p>
          </div>

          <div className="grid divide-y divide-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {PLANOS_CUSTO.map((p) => {
              const porAnalise = p.mensal / p.analises;
              // 8 cortes é o teto do plano de entrada — o divisor mais
              // conservador. Prometer o custo dos 15 do Creator inflaria a
              // conta pra quem entra pelo Lite.
              const porCorte = porAnalise / 8;
              return (
                <div
                  key={p.nome}
                  className={
                    "px-6 py-6 text-center " + (p.destaque ? "bg-orange-600/[0.07]" : "")
                  }
                >
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    {p.nome}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-zinc-50">
                    R$ {brl(porCorte)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">por corte</p>
                  <p className="mt-3 text-[11px] tabular-nums text-zinc-600">
                    R$ {brl(p.mensal)} ÷ {p.analises} análises ÷ 8 cortes
                  </p>
                </div>
              );
            })}
          </div>

          {/* O aviso que impede a seção de virar promessa de renda. */}
          <div className="flex items-start gap-2.5 border-t border-zinc-800 bg-zinc-950/40 px-6 py-4">
            <Info size={15} weight="fill" className="mt-px shrink-0 text-zinc-600" />
            <p className="text-xs leading-relaxed text-zinc-500">
              O painel entrega roteiro e direção — não entrega audiência nem
              receita. Quanto cada pessoa ganha depende do nicho, da execução e
              da constância. Não prometemos resultado financeiro, e desconfie de
              quem promete.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="#planos"
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98]"
          >
            Ver os planos
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
