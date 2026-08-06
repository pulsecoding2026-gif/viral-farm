"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vídeo de fundo do hero.
 *
 * Loop simples, sem vai-e-volta: comparei o primeiro e o último quadro deste
 * material e a diferença média deu 0,49 numa escala de 0 a 255 — ele já fecha
 * sozinho. Montar ida-e-volta aqui dobraria o peso sem ganho visual.
 *
 * O encode importa tanto quanto o conteúdo. A versão anterior travava, e a
 * causa não era o tamanho do arquivo:
 *   - taxa de quadros variável, que o navegador reproduz aos trancos.
 *     Resolvido com `fps` no filtro e `-fps_mode cfr` na saída;
 *   - keyframe só no primeiro quadro, obrigando cada volta do loop a
 *     reconstruir a imagem desde o começo. Agora há um por segundo.
 *
 * A outra metade do travamento era CSS, não vídeo: `backdrop-blur` sobre
 * conteúdo animado obriga o compositor a refazer o desfoque a cada quadro.
 * Ver navegacao-site.tsx e hero-entrada.tsx.
 *
 * `muted` não é escolha estética: sem ele o navegador bloqueia o autoplay.
 * `playsInline` impede o iOS de abrir o vídeo em tela cheia sozinho.
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
    return (
      /* É o pôster do próprio vídeo, já comprimido na geração; passar pelo
         next/image só criaria uma segunda cópia do mesmo quadro. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/hero-farm-v7-poster.jpg"
        alt=""
        className={"h-full w-full object-cover object-top " + className}
      />
    );
  }

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/hero-farm-v7-poster.jpg"
      aria-hidden="true"
      className={"h-full w-full object-cover object-top " + className}
    >
      <source src="/hero-farm-v7.mp4" type="video/mp4" />
    </video>
  );
}
