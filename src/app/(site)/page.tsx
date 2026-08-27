import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { NavegacaoSite } from "./navegacao-site";
import { HeroVideo } from "./hero-video";
import { HeroEntrada } from "./hero-entrada";
import { ComoFunciona } from "./como-funciona";
import { Monetizacao } from "./monetizacao";
import { Planos } from "./planos";
import { Perguntas } from "./perguntas";
import { Logo } from "../logo";
import { NAO_AFILIADO } from "@/lib/gta/marca";
import { LANCAMENTO } from "@/lib/gta/lancamento";

/**
 * Chips de capacidade sob o hero.
 *
 * Cada um é uma coisa que o sistema REALMENTE faz hoje — o rastreamento de
 * rosto e o enquadramento em três atos existem e estão medidos. Prometer aqui
 * o que ainda não roda é o jeito mais barato de perder um assinante no
 * primeiro corte que ele gerar.
 */
const CAPACIDADES = [
  "Corta live de 6h sozinho",
  "Legenda animada palavra a palavra",
  "A câmera segue o rosto",
  "Título na tela",
  "Tira os silêncios",
  "Acha o melhor momento",
];


export default function LandingPage() {
  /*
   * Contado no SERVIDOR, a cada requisição.
   *
   * Não é `useState` nem efeito: um número de dias não muda enquanto a pessoa
   * lê a página, então não há motivo para mandar relógio ao navegador. Assim
   * ele já chega pronto no HTML — sem piscar, sem divergência de hidratação, e
   * o componente continua sendo servidor.
   */
  const diasParaLancamento = Math.max(
    0,
    Math.ceil(
      (new Date(LANCAMENTO.quando).getTime() - Date.now()) / 86_400_000,
    ),
  );

  return (
    <div className="min-h-screen bg-[#09090b]">
      <NavegacaoSite />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        {/*
          Faixa de vídeo com altura fixa, não `inset-0`. A seção inteira passa
          de 1400px; esticar um 16:9 até cobrir isso ampliaria o quadro umas 2x
          e sobraria só o meio do tronco.
          A altura anda junto com o recuo do bloco de texto abaixo: é a relação
          entre os dois que decide em que ponto da figura o título cai. Mexer
          num sem o outro desalinha a composição.
        */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] sm:h-[520px] lg:h-[620px] xl:h-[680px]">
          <HeroVideo />

          {/*
            Só costura nas pontas, nada sobre a cena — e o vídeo também não
            leva ajuste de brilho ou contraste no encode: é o material como
            veio.

            O degradê do topo existe porque o cabeçalho ocupa espaço no fluxo:
            o vídeo começa logo abaixo dele e, sem isso, aparece uma linha reta
            cortando a tela. O da base costura com a seção seguinte.
          */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#09090b] via-[#09090b]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-b from-transparent to-[#09090b]" />
        </div>

        {/*
          O recuo grande no topo posiciona o texto na altura das pernas da
          figura, deixando corpo e cartões livres acima.

          Não dá pra descer mais: com a figura inteira visível E o texto abaixo
          dela, o campo de link — a ação principal — cai fora da primeira tela.
          Estes valores são o ponto onde os dois ainda cabem em 900px de altura.
        */}
        <div className="relative mx-auto max-w-6xl px-5 pt-[17rem] pb-16 sm:px-8 sm:pt-[22rem] sm:pb-20 lg:pt-[26rem] xl:pt-[28rem]">
          <div className="mx-auto max-w-3xl text-center">
            {/*
              O selo passou a carregar a URGÊNCIA, que era o trabalho do
              contador. A diferença é que aqui ela é uma informação de contexto
              — quantos dias faltam para o lançamento — e não um relógio
              animado disputando atenção com o campo de link.

              A contagem sai de `lancamento.ts`, a mesma fonte única de sempre:
              se a Rockstar adiar pela terceira vez, este número se corrige
              sozinho junto com o resto do site.
            */}
            <p className="placa inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-zinc-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
              {diasParaLancamento} dias para o GTA VI
            </p>

            {/*
              A PROMESSA, e por que ela é escrita assim.

              Duas forças puxando: "sem aparecer" abre o público (não precisa
              de câmera, audiência nem equipamento — qualquer um monta um canal
              de cortes) e "dinheiro" é o que faz a pessoa agir. As duas cabem
              na mesma frase.

              O que NÃO entra aqui: promessa de quanto se ganha. "Fature R$ X
              por mês" venderia mais rápido e é o tipo de frase que volta como
              pedido de reembolso e print no Reddit — além de ser exatamente o
              que a plataforma não pode garantir. O fato verdadeiro já é forte:
              o GTA V criou canais enormes, e os do GTA VI ainda não existem.
              A oportunidade é real, quem entrega o resultado é a pessoa.
            */}
            {/*
              Sem `italic` e sem `font-semibold`: Anton tem um peso só e não tem
              itálico. Pedir os dois faz o navegador SIMULAR — engrossa o
              contorno e inclina por transformação — e em corpo de 60px isso
              aparece como letra suja. A ênfase da segunda linha vem da cor, que
              é o recurso que a fonte realmente tem.
            */}
            {/*
              Branco, pesado, com contorno preto — e UMA palavra em rosa.
              É a fórmula do brandbook: a tipografia não disputa com o
              gradiente, ela se impõe por cima da imagem cinematográfica, e o
              rosa aparece uma vez só, onde está o soco da frase.
            */}
            {/*
              DUAS LINHAS, e a frase foi encurtada para caber nelas.

              A versão longa ("O GTA V criou canais milionários. Os do GTA VI
              ainda não existem.") quebrava em quatro linhas em Archivo Black —
              que é bem mais larga que a Anton que estava aqui antes — e
              empurrava o campo de link para fora da primeira tela. Reduzir o
              corpo resolveria a quebra e mataria o impacto, que é o motivo de
              existir uma display.

              O brandbook decide o empate: "títulos curtos, poucas palavras,
              leitura extremamente rápida" e "evitar títulos com 3 ou 4 linhas
              pequenas". Encurtar a frase é a resposta certa; diminuir a letra
              seria a errada.
            */}
            <h1 className="titulo-letreiro titulo-hero mt-6 text-4xl leading-[1.02] sm:text-6xl">
              GTA V fez milionários.
              <br />
              Os do VI <span className="acento-rosa">ainda não</span>.
            </h1>

            {/*
              O RP é citado por nome porque é O formato do GTA no Brasil: foi o
              roleplay, e não o modo história, que sustentou as maiores
              audiências brasileiras do GTA V por anos. Quem cliba aqui cliba
              RP — e reconhecer isso na primeira frase separa quem entende o
              nicho de quem traduziu uma landing gringa.

              Nomes de streamers ficam FORA da página de venda, mesmo os
              óbvios. Citar uma pessoa real como prova de que "dá dinheiro" lê
              como endosso, e endosso que não foi dado é problema com a pessoa
              e com quem leu. O fenômeno se sustenta sem nome próprio.
            */}
            {/*
              COMEÇA NO GTA V, e isso não é detalhe de texto: é o furo que
              quase entrou no ar.

              Ninguém jogou GTA VI ainda. Até 19 de novembro não existe
              gameplay para cortar — o que existe é material da Rockstar, que a
              nossa própria política proíbe e que a Take-Two está derrubando por
              DMCA. Uma home que promete "monte seu canal de cortes de GTA VI"
              entrega tela vazia para quem se cadastrar hoje.

              O RP de GTA V resolve: é abundante, é o formato que fez as maiores
              audiências brasileiras da franquia, e treina exatamente a mesma
              habilidade. E se o jogo adiar pela terceira vez, perde-se a
              urgência da campanha — não a matéria-prima do produto.
            */}
            <p className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-zinc-300 sm:text-lg">
              <b className="font-semibold text-zinc-100">
                Comece hoje com o RP que já bomba
              </b>{" "}
              — sem aparecer, sem gravar, sem editar. Cole o link de uma live da
              Twitch ou do Kick e a IA devolve os Shorts prontos. Quando o VI
              sair, seu canal já tem público.
            </p>

            {/* O campo de link é a demonstração mais barata que existe —
                esconder atrás de "criar conta" joga fora a chance. */}
            <HeroEntrada />

            {/*
              O CONTADOR SAIU DO HERO — o Extended Look estreou em 27/08.
              Ele continua existindo em `contagem-lancamento.tsx` e continua
              apontando sozinho para o próximo marco oficial (preload em 12/11,
              lançamento em 19/11). O que mudou foi o lugar: com o evento da
              semana já no ar, um relógio marcando 80 dias não cria urgência —
              cria distração, e concorre com o campo de link, que é a única
              coisa que a pessoa precisa fazer nesta tela.
              Ele volta ao hero quando faltar pouco para 19/11, e aí é uma
              linha.
            */}
            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-600">
              <ShieldCheck size={14} className="text-emerald-600" />O vídeo é
              processado e apagado. Fica só a análise.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {CAPACIDADES.map((c) => (
              <span
                key={c}
                className="placa rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-[11px] text-zinc-400"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/*
        CINCO SEÇÕES, e antes eram nove.
        Saíram VisaoIA, DestaquesDuplos e DestaqueBiblioteca — três blocos que
        passeavam pelos recursos da ferramenta genérica. Numa página movida a
        urgência (o lançamento tem data), cada rolagem a mais é uma chance de
        a pessoa desistir antes do preço. O que ficou responde, na ordem: o que
        é, prova que funciona, por que dá dinheiro, quanto custa e a dúvida que
        trava a compra.
        Os componentes continuam existindo no repositório — se um deles fizer
        falta, é uma linha para trazer de volta.
      */}
      {/*
        QUATRO SEÇÕES, e a ordem responde às perguntas na ordem em que elas
        aparecem na cabeça de quem chegou pelo hero de dinheiro:
        de onde sai a grana → funciona mesmo → quanto custa → e se der errado.

        O "método" saiu, e ele sozinho era 2.604px dos 9.882 da página. Além do
        tamanho, as maquetes dele mostravam abas de módulos que a virada tirou
        do menu e categorias de outro produto ("Curiosidades", "Fitness") —
        numa página que promete foco em GTA, isso não é só ruído, é
        desmentido. O componente continua no repositório.
      */}
      {/* A linha de horizonte com o gradiente oficial separando os blocos —
          o detalhe mais barato que amarra a página ao logo. */}
      <hr className="horizonte" />
      <ComoFunciona />
      <Monetizacao />
      <hr className="horizonte" />
      <Planos />
      <Perguntas />

      {/* ----------------------------------------------------------- rodapé */}
      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="max-w-[150px]" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-600">
            {/* "#metodo" saiu junto com a seção — âncora sem destino rola
                para lugar nenhum e parece site quebrado. */}
            <a href="#monetizacao" className="transition hover:text-zinc-400">
              Monetização
            </a>
            <a href="#planos" className="transition hover:text-zinc-400">
              Planos
            </a>
            <Link href="/entrar" className="transition hover:text-zinc-400">
              Entrar
            </Link>
            {/* Exigidos na revisão de app do TikTok e do Google — precisam
                estar acessíveis de qualquer página pública. */}
            <Link href="/termos" className="transition hover:text-zinc-400">
              Termos
            </Link>
            <Link href="/politica" className="transition hover:text-zinc-400">
              Privacidade
            </Link>
          </div>
        </div>

        {/*
          O aviso de não-afiliação, em toda página pública.
          Custa uma linha e é o que separa "site de fã" de "site que se passa
          por oficial" — ver docs/gta/politica-de-conteudo.md. Fica legível de
          verdade (zinc-500, não 600): aviso que ninguém consegue ler não
          cumpre a função de avisar.
        */}
        <div className="border-t border-zinc-800/40">
          <p className="mx-auto max-w-6xl px-5 py-5 text-[11px] leading-relaxed text-zinc-500 sm:px-8">
            {NAO_AFILIADO}
          </p>
        </div>
      </footer>
    </div>
  );
}
