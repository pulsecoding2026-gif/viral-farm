import Link from "next/link";
import { ArrowLeft, ShieldCheck, Check } from "@phosphor-icons/react/dist/ssr";
import { Logo, Simbolo } from "../logo";
import { MARCA } from "@/lib/gta/marca";

/**
 * Moldura das telas de entrar e criar conta.
 *
 * A coluna da direita ERA o pôster `/acesso-viral-farm.png` (1,8 MB, arte da
 * marca antiga) — trocado por uma composição 100% CSS na identidade nova
 * (céu de Miami + símbolo gigante translúcido). Dois motivos, não só um:
 * a arte antiga não combina mais com nada, e uma tela de formulário some no
 * celular de qualquer forma (ver abaixo), então pagar 1,8 MB de download por
 * uma vitrine que a maioria das visitas nem carrega nunca fez sentido — a
 * composição em CSS pesa zero.
 *
 * O arquivo `/acesso-viral-farm.png` continua em `public/`: não apago porque
 * outro agente mexe em `public/` nesta mesma virada. Só parei de referenciá-lo.
 *
 * No celular a coluna some por inteiro: depois do clique em "criar conta",
 * argumento de venda é ruído entre a pessoa e o campo.
 */
export function AcessoLayout({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  rodape: React.ReactNode;
}) {
  return (
    // bg-zinc-950 aponta para --fundo-poco (#080808, GTA Black) — a rampa foi
    // reescrita em globals.css, então não precisa mais do hex solto daqui.
    <div className="flex min-h-screen bg-zinc-950">
      {/* ----------------------------------------------------- formulário */}
      <div className="flex w-full flex-col px-5 py-7 sm:px-10 lg:w-[54%] lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={MARCA}
            className="min-w-0 transition-opacity hover:opacity-80"
          >
            <Logo className="max-w-[164px]" />
          </Link>
          {/* zinc-500 (medido: 4,02:1 sobre o fundo desta página) reprova o
              mínimo de 4,5:1 pra texto normal. zinc-400 mede 7,58:1. */}
          <Link
            href="/"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <ArrowLeft size={13} weight="bold" />
            Voltar
          </Link>
        </div>

        {/* `justify-center` com padding curto em vez de `flex-1 items-center`:
            o formulário é baixo, e centralizar numa coluna de altura total
            abria vãos enormes em cima e embaixo. */}
        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-sm lg:mx-0">
            {/* Archivo 700 em caixa mista — nunca uppercase em título, é
                regra da identidade (docs/gta/identidade.md). */}
            <h1 className="fonte-titulo text-2xl font-bold tracking-tight text-white">
              {titulo}
            </h1>
            {/* zinc-500 media 4,02:1 aqui — abaixo dos 4,5:1 exigidos pra
                texto normal. zinc-400 mede 7,58:1. */}
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              {subtitulo}
            </p>

            <div className="mt-6">{children}</div>

            <div className="mt-5 text-sm text-zinc-400">{rodape}</div>

            <p className="mt-6 flex items-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck size={13} className="shrink-0 text-emerald-600" />
              O vídeo é processado e apagado. Fica só a análise.
            </p>

            {/*
              Aviso de não afiliação — obrigatório no rodapé de toda página
              PÚBLICA (docs/gta/identidade.md §9). Entrar e cadastro são
              acessíveis sem login, então contam como página pública mesmo
              vivendo fora do site de marketing. `--texto-3` sobre o fundo
              desta coluna mede ~5,4:1 — passa AA com folga, medido à mão
              (ver relatório da tarefa).
            */}
            <p className="mt-4 text-[11px] leading-relaxed text-[var(--texto-3,#858585)]">
              {MARCA} é um projeto independente de fãs, sem afiliação com a
              Rockstar Games ou a Take-Two Interactive.
            </p>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- vitrine */}
      {/*
        Composição 100% CSS — sem imagem baixada. `.ceu-noturno` (definido em
        gta-tokens.css, que este agente não edita) já dá a parede de preto com
        a brasa de rosa/roxo que o brandbook pede; o símbolo gigante e quase
        invisível no canto é o mesmo truque de "arte de personagem" que
        `.mancha-cartao` usa em outros lugares — decoração da marca, não uma
        imagem de terceiro.
      */}
      <aside className="ceu-noturno relative hidden overflow-hidden border-l border-zinc-800 lg:flex lg:w-[46%] lg:flex-col">
        {/* Símbolo decorativo gigante, bem apagado — textura, não logo. */}
        <Simbolo
          tamanho={420}
          className="pointer-events-none absolute -right-20 -bottom-24 text-white/[0.05]"
        />

        <div className="relative flex flex-1 flex-col justify-center px-12 pb-10 xl:px-16">
          <p className="placa text-[11px] text-orange-400">
            Cortes para criadores de GTA VI
          </p>
          {/*
            NEM "sua live" NEM "seu rosto" — o mesmo erro que a home já
            corrigiu. Quem monta canal de cortes aqui não clipa a própria
            live: cola o link da live de OUTRA pessoa (RP de GTA V na
            Twitch/Kick) e recebe os cortes de volta. E o rastreamento de
            rosto segue o STREAMER que aparece no vídeo de origem, não quem
            usa a plataforma — a promessa central é justamente não aparecer.
            Ver docs/gta/plano-mestre.md §1.
          */}
          <p className="fonte-titulo mt-3 max-w-[20ch] text-3xl leading-[1.1] font-bold tracking-tight text-white">
            Cole o link.{" "}
            <span className="acento-rosa">Vira uma semana de Shorts.</span>
          </p>

          <ul className="mt-6 space-y-2.5">
            {[
              ["Transcrição por palavra", "cada uma com seu tempo"],
              ["Melhores momentos de gameplay", "com nota e o motivo escrito"],
              [
                "Câmera sempre no streamer",
                "cortes 9:16 legendados, sem você aparecer",
              ],
            ].map(([titulo, detalhe]) => (
              <li key={titulo} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
                  <Check size={9} weight="bold" />
                </span>
                <span className="text-sm text-zinc-300">
                  {titulo}
                  <span className="text-zinc-400"> — {detalhe}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-400">
            De 40 a 90 segundos por análise. Pode fechar a aba — o processamento
            continua no servidor.
          </p>
        </div>
      </aside>
    </div>
  );
}
