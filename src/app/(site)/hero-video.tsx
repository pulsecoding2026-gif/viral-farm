"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vídeo de fundo do hero.
 *
 * `muted` não é escolha estética: sem ele o navegador bloqueia o autoplay.
 * `playsInline` impede o iOS de abrir o vídeo em tela cheia sozinho.
 *
 * O QUE APRENDEMOS COM O MATERIAL ANTERIOR, e vale conferir neste:
 *
 * O vídeo antigo travava, e a causa não era o tamanho do arquivo:
 *   - taxa de quadros variável, que o navegador reproduz aos trancos —
 *     resolve com `fps` no filtro e `-fps_mode cfr` na saída;
 *   - keyframe só no primeiro quadro, obrigando cada volta do loop a
 *     reconstruir a imagem desde o começo — o certo é um por segundo.
 *
 * Metade do travamento era CSS, não vídeo: `backdrop-blur` sobre conteúdo
 * animado obriga o compositor a refazer o desfoque a cada quadro. Ver
 * navegacao-site.tsx e hero-entrada.tsx.
 *
 * O material novo entrou como veio, sem reencode. Se ele travar no loop, é
 * quase certo que seja um dos dois motivos acima — e o conserto é o comando
 * de reencode, não trocar o arquivo.
 *
 * MEDIDO NO ARQUIVO ATUAL (sonda de caixas MP4, sem ffprobe — ver
 * docs/gta/performance.md):
 *   - 1280x720, 8s, 24 fps EXATOS (192 quadros / 8s) — a taxa é constante,
 *     então a primeira armadilha acima não se aplica a este material;
 *   - keyframes: UM SÓ, no primeiro quadro. A segunda armadilha ESTÁ AQUI.
 *     Cada volta do loop reconstrói a imagem desde o início. É o motivo de
 *     reencodar com `-g 24` (um keyframe por segundo);
 *   - `faststart` já está correto: o `moov` vem antes do `mdat`. Não adianta
 *     repetir `-movflags +faststart` esperando ganho — ele já está feito;
 *   - TEM TRILHA DE ÁUDIO: 128 kbps, 125,7 KB. O vídeo toca com `muted` e
 *     `aria-hidden`, ou seja, é 100% peso morto que ninguém jamais ouve.
 *   - 3,77 MB para 8 segundos = 3810 kbps de vídeo. Para 720p isso é o dobro
 *     do necessário. O reencode está documentado e pendente na VPS.
 */
/**
 * A API de informação de rede ainda não está no lib.dom padrão, então o tipo
 * vem daqui. É opcional em tudo: no Safari e no Firefox ela simplesmente não
 * existe, e nesse caso o vídeo toca normalmente.
 */
type ConexaoDoNavegador = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
};

/**
 * Vale a pena gastar 3,8 MB com um enfeite de fundo nesta conexão?
 *
 * MEDIDO: `preload="metadata"` NÃO economiza nada quando o vídeo tem
 * `autoplay` — o navegador precisa do arquivo para tocar, e baixa os 3,8 MB
 * igual (experimento com os dois valores lado a lado deu 3860,2 KB nos dois).
 * Ou seja: a única forma de não gastar os megabytes é NÃO PEDIR O VÍDEO.
 *
 * Então quem avisa que está economizando dados, ou está em rede lenta, recebe
 * o mesmo fundo chapado do `prefers-reduced-motion`. O site continua de pé —
 * o vídeo é decoração, não conteúdo.
 *
 * ONDE A LINHA FOI TRAÇADA, e por quê:
 *
 * Só `saveData`, `2g` e `slow-2g` cortam o vídeo. `3g` NÃO corta, de propósito.
 *
 * O Chrome carimba de `3g` uma fatia enorme de gente em 4G congestionada — no
 * teste aqui, uma conexão de 1,45 Mbps veio como `3g`. Cortar o vídeo nesse
 * grupo tiraria o hero de boa parte do público-alvo, e isso é decisão de
 * produto, não de performance: quem manda na cara da home não é este arquivo.
 *
 * `saveData` é pedido explícito do usuário e `2g` não tem defesa possível para
 * 3,8 MB — esses dois são seguros de decidir aqui.
 *
 * Se depois do reencode (ver docs/gta/performance.md) alguém quiser incluir
 * `3g`, é só somar `|| c.effectiveType === "3g"` nesta função.
 */
function redeFraca(): boolean {
  const c = (navigator as Navigator & { connection?: ConexaoDoNavegador })
    .connection;
  if (!c) return false; // navegador não conta: no benefício da dúvida, toca.
  if (c.saveData) return true;
  return c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

export function HeroVideo({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [semMovimento, setSemMovimento] = useState(false);
  /*
   * Começa `false` no servidor e no primeiro render do cliente: `navigator`
   * não existe na renderização do servidor, e decidir diferente dos dois lados
   * quebraria a hidratação. A troca acontece no efeito, depois de montar.
   */
  const [semVideo, setSemVideo] = useState(false);

  useEffect(() => {
    const fraca = redeFraca();
    setSemVideo(fraca);

    /*
     * A FONTE DO VÍDEO É LIGADA AQUI, não no HTML do servidor. Este é o ponto
     * do arquivo que realmente economiza banda.
     *
     * Com `<source src>` vindo pronto no HTML, o navegador começa a baixar os
     * 3,8 MB durante a leitura do documento — antes de qualquer JavaScript
     * rodar. Nenhuma checagem de rede feita depois chegaria a tempo: o download
     * já estaria em andamento. Por isso o `src` só entra depois de montar, e só
     * quando vale a pena.
     *
     * Efeito colateral bem-vindo: o vídeo sai do caminho crítico. Fontes, CSS
     * e o JS da página deixam de disputar banda com um enfeite de fundo, o que
     * é exatamente o que importa em celular na rede móvel.
     */
    const v = ref.current;
    if (v && !fraca && !v.getAttribute("src")) {
      v.setAttribute("src", "/hero-gta-viral.mp4");
      void v.play().catch(() => {});
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => {
      setSemMovimento(mq.matches);
      // Pausar de verdade, não só esconder: vídeo oculto continua decodificando
      // quadro a quadro e gastando bateria de quem pediu menos movimento.
      if (mq.matches) ref.current?.pause();
      else void ref.current?.play().catch(() => {});
    };
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  if (semMovimento || semVideo) {
    /*
     * SEM PÔSTER PRÓPRIO AINDA.
     *
     * O material novo veio sem um JPG de primeiro quadro, e o do vídeo antigo
     * mostraria uma cena que não existe mais — pior que não mostrar nada. Um
     * fundo chapado na cor do site é honesto e não quebra o layout: quem pediu
     * menos movimento recebe menos movimento, não uma imagem errada.
     *
     * Para gerar o pôster de verdade, na VPS:
     *   ffmpeg -ss 1 -i public/hero-gta-viral.mp4 -frames:v 1 -q:v 3 \
     *     public/hero-gta-viral-poster.jpg
     * e então voltar o `poster` e o `<img>` a apontar para ele.
     */
    return <div className={"h-full w-full bg-[#080808] " + className} />;
  }

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      /*
       * `metadata` em vez de `auto`, mas SEM ILUSÃO sobre o que isso rende.
       *
       * MEDIDO, com os dois valores lado a lado no mesmo navegador: com
       * `autoplay`, os dois baixam o arquivo inteiro — 3860,2 KB cada. O
       * `preload` é só uma dica de pré-carregamento, e `autoplay` a atropela,
       * porque para tocar é preciso ter o vídeo. Trocar `auto` por `metadata`
       * NÃO economiza um byte sozinho; quem economiza é o `src` que só é
       * ligado depois de montar, no efeito acima.
       *
       * Fica em `metadata` porque é a dica honesta — nos casos em que o
       * navegador adia o autoplay (aba em segundo plano, economia de bateria)
       * ele respeita a dica e não busca o arquivo à toa.
       *
       * `muted` + `playsInline` continuam obrigatórios: sem os dois o
       * navegador bloqueia o autoplay e o iOS abre em tela cheia.
       */
      preload="metadata"
      aria-hidden="true"
      /*
       * `object-top`, não `object-center`.
       *
       * O vídeo é 16:9 e a faixa do hero é bem mais larga que alta. Com
       * `object-cover`, o navegador escala pela largura e corta o excedente na
       * ALTURA — e `object-center` tira metade em cima, metade embaixo. Só que
       * a composição do vídeo tem o letreiro no terço superior: cortar por
       * cima decapita justamente o elemento que faz a capa ser reconhecível.
       *
       * Alinhando pelo topo, o corte inteiro vai para a base, onde há só
       * reflexo de asfalto — a parte da imagem que ninguém perde.
       */
      className={"h-full w-full object-cover object-top " + className}
    >
      {/*
        Sem `<source>` aqui de propósito — ver o efeito acima. Se a fonte
        voltar para o HTML do servidor, o navegador retoma o download dos
        3,8 MB durante a leitura do documento e a checagem de rede vira
        enfeite, porque ela roda tarde demais para impedir qualquer coisa.
      */}
    </video>
  );
}
