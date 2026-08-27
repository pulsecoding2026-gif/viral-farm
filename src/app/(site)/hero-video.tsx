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
export function HeroVideo({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [semMovimento, setSemMovimento] = useState(false);

  useEffect(() => {
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

  if (semMovimento) {
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
       * `metadata`, não `auto`: com `auto` o navegador puxava os 3,8 MB
       * inteiros como custo de entrada da home, ANTES de o visitante decidir
       * se fica. Em 4G brasileira isso é a página toda travada atrás de um
       * enfeite de fundo.
       *
       * O autoplay NÃO quebra: `preload` é só uma dica de quanto baixar
       * adiantado, e `autoPlay` continua mandando o navegador tocar — ele
       * busca o que precisa e começa. O vídeo entra um pouco depois, por cima
       * do fundo escuro que já está pintado, em vez de segurar o resto.
       *
       * `muted` + `playsInline` continuam obrigatórios: sem os dois o
       * navegador bloqueia o autoplay e o iOS abre em tela cheia.
       */
      preload="metadata"
      aria-hidden="true"
      className={"h-full w-full object-cover object-center " + className}
    >
      <source src="/hero-gta-viral.mp4" type="video/mp4" />
    </video>
  );
}
