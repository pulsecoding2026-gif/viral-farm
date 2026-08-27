/**
 * O "VI" como textura de marca — não como logotipo.
 *
 * O brandbook dedica uma seção a isto: o "VI" pode ser "praticamente um
 * segundo símbolo da marca", gigante o bastante pra sair da tela, cortado nas
 * bordas, e vivendo ATRÁS do conteúdo, quase uma marca-d'água. É exatamente o
 * elemento que faltava para preencher o vazio depois do hero sem custar peso
 * nem risco de marca.
 *
 * Duas letras, DESENHADAS, não escritas:
 *   - nada de Anton/Archivo Black em tamanho gigante — isso seria reproduzir
 *     de novo o mesmo letreiro do jogo, só que em opacidade baixa;
 *   - o traço é um V feito de uma única linha grossa em ziguezague
 *     (stroke-linejoin miter) e um I é um bloco reto sem serifa. É
 *     deliberadamente mais simples e mais reto que o logotipo oficial — sem
 *     o corte diagonal nem o gradiente de pôr do sol que caracterizam aquele
 *     letreiro, porque a forma tem que se sustentar sozinha como desenho
 *     nosso, não como cópia em opacidade baixa.
 *
 * `currentColor`: quem usa decide a cor e a opacidade via className
 * (`text-[...]` + `opacity-[...]`), pra cada seção poder ajustar a dose sem
 * duplicar o SVG.
 */
export function ViTextura({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M70 10 L390 590 L710 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="150"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <rect x="800" y="10" width="150" height="580" fill="currentColor" />
    </svg>
  );
}
