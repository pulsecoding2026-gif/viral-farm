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
/**
 * O QUE AS PLATAFORMAS PAGAM — faixas públicas de mercado, não previsão nossa.
 *
 * Esta tabela substituiu a de "custo por corte". O raciocínio do dono está
 * certo: mostrar o que a pessoa PAGA vende pelo preço; mostrar o que ela pode
 * RECEBER vende pela oportunidade.
 *
 * O QUE ESTES NÚMEROS SÃO, E O QUE NÃO SÃO
 *
 * São faixas de RPM (receita por mil visualizações) reportadas publicamente
 * para vídeo curto, convertidas para real. NÃO são medição nossa, NÃO são
 * garantia e variam MUITO — o próprio intervalo (de 6x entre piso e teto)
 * é a informação mais honesta aqui.
 *
 * O que mais move o número, e por isso está escrito na tela:
 *   · o país de quem assiste (view do Brasil paga bem menos que dos EUA);
 *   · o nicho (games rende menos que finanças ou tecnologia);
 *   · o formato (o MESMO conteúdo rende uma fração em curto se comparado ao
 *     vídeo longo).
 *
 * Por que mostrar mesmo sendo baixo: porque é verdade, e porque o argumento
 * do produto não é "o fundo das plataformas te enriquece" — é que o fundo é
 * UMA das quatro fontes, todas dependentes de volume, e volume é exatamente o
 * que a ferramenta destrava. Inflar a tabela venderia mais rápido e voltaria
 * como reembolso.
 *
 * Fonte das faixas: reportagens de mercado sobre RPM de Shorts (2026).
 * Conversão a ~R$ 5,40/US$. Se o câmbio andar muito, revisar.
 */
const PAGAMENTO_PLATAFORMA = [
  {
    nome: "YouTube Shorts",
    minMil: 0.05,
    maxMil: 0.32,
    nota: "Fundo de criadores, por view monetizada",
  },
  {
    nome: "TikTok",
    minMil: 0.11,
    maxMil: 0.54,
    nota: "Programa de recompensas, exige vídeo de 1 min+",
    destaque: true,
  },
  {
    nome: "Reels",
    minMil: 0.05,
    maxMil: 0.27,
    nota: "Bônus por convite, disponibilidade varia",
  },
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
                /*
                 * `bg-zinc-900` sólido (#111111), não `/30`.
                 *
                 * Era um cartão translúcido a 30% sobre o `ceu-miami` da
                 * seção — a única diferença real entre isso e o cartão de
                 * `como-funciona.tsx` (que usa #111111 cheio) era a
                 * transparência, sem motivo funcional: aqui não há vídeo por
                 * baixo que precise transparecer, e o brandbook pede fundo de
                 * cartão sólido. Translúcido sobra pra chrome flutuante sobre
                 * imagem — cabeçalho, campo do hero.
                 */
                className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.cor} text-white`}
                >
                  <Icone size={19} weight="fill" />
                </span>
                <div className="min-w-0">
                  {/* text-base: sem tamanho, o título herdava o mesmo 14px do
                      parágrafo abaixo — só o peso os separava, e "quase do
                      mesmo tamanho" lê como hierarquia quebrada. */}
                  <h3 className="text-base font-semibold text-zinc-50">
                    {c.titulo}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                    {c.texto}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* A conta que justifica o plano — números nossos, conferíveis.
            `bg-zinc-900` sólido pelo mesmo motivo do grid acima. */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-6 py-5 text-center">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-50">
              O que as plataformas pagam
            </h3>
            {/* zinc-500 media 4,14:1 sobre este fundo — abaixo do 4,5:1 de
                texto normal. zinc-400 dá 7,81:1. */}
            <p className="mx-auto mt-1.5 max-w-[54ch] text-sm leading-relaxed text-zinc-400">
              Faixas de mercado por{" "}
              <b className="font-semibold text-zinc-200">mil visualizações</b>.
              Variam com o país de quem assiste, o nicho e o formato — o
              intervalo largo é a parte honesta do número.
            </p>
          </div>

          <div className="grid divide-y divide-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {PAGAMENTO_PLATAFORMA.map((p) => (
              <div
                key={p.nome}
                className={
                  "px-6 py-6 text-center " + (p.destaque ? "bg-orange-600/[0.07]" : "")
                }
              >
                {/* `.placa` (Bebas Neue) é a classe de rótulo da identidade —
                    caixa alta só aqui, nunca em título. */}
                <p className="placa text-zinc-400">{p.nome}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-zinc-50">
                  R$ {brl(p.minMil)}
                  <span className="text-zinc-500"> a </span>
                  {brl(p.maxMil)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  por mil visualizações
                </p>
                {/*
                  A projeção por milhão, que é a escala em que a pessoa pensa —
                  ninguém raciocina em "mil views". Sai da mesma faixa, só
                  multiplicada, então não inventa nada: se a faixa por mil
                  estiver certa, esta está também.
                */}
                <p className="mt-3 text-[11px] tabular-nums text-zinc-400">
                  R$ {brl(p.minMil * 1000)} a {brl(p.maxMil * 1000)} por 1 milhão
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {p.nota}
                </p>
              </div>
            ))}
          </div>

          {/*
            O aviso que impede a seção de virar promessa de renda.
            Ícone zinc-600→zinc-500 (3,29:1 → passa o 3:1 de elemento gráfico)
            e texto zinc-500→zinc-400 (4,14:1 → 7,81:1): é o parágrafo que
            mais precisa ser lido nesta seção, o disclaimer legal, e era o que
            estava com a cor mais apagada.
          */}
          <div className="flex items-start gap-2.5 border-t border-zinc-800 bg-zinc-950/40 px-6 py-4">
            <Info size={15} weight="fill" className="mt-px shrink-0 text-zinc-500" />
            <p className="text-xs leading-relaxed text-zinc-400">
              Estes valores são <b className="font-semibold text-zinc-200">faixas
              públicas de mercado</b>, não uma previsão do que você vai ganhar.
              View do Brasil paga menos que dos Estados Unidos, games rende
              menos que finanças, e a maior parte das visualizações não é
              monetizada. Nenhuma plataforma garante valor por view — nós
              entregamos os cortes, não a audiência nem a receita. Desconfie de
              quem promete número certo.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          {/*
            `bg-orange-700`, não `bg-orange-600`, com texto branco.
            Medido: branco sobre acao-600 (#ee4f9c) dá 3,37:1 — reprova o
            4,5:1 de texto normal (este botão é 14px, não conta como "grande").
            Branco sobre acao-700 (#c73a7d) dá 4,85:1, e é exatamente o papel
            que o token já reserva pra isso (ver o comentário de --acao-700 em
            gta-tokens.css). O glow também trocou: `rgb(255_62_2)` é o laranja
            da marca ANTERIOR — o brilho ficava laranja num botão rosa.
          */}
          <Link
            href="#planos"
            className="inline-flex items-center gap-2 rounded-full bg-orange-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgb(199_58_125/0.35)] transition hover:bg-orange-600 active:scale-[0.98]"
          >
            Ver os planos
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
