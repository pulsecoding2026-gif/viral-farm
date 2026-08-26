import Image from "next/image";
import { MARCA } from "@/lib/gta/marca";

/**
 * Marca do produto — arquivos do cliente, sem redesenho.
 *
 * O lockup é PNG, não SVG, de propósito: o texto da marca é branco, e a
 * vetorização que recebemos o perdia por completo (vetorizador só captura
 * forma com cor). O PNG tem tudo, com canal alfa, então funciona sobre o
 * escuro. Medido: play laranja em 0–164, texto branco em 217–1092, sem sobra.
 *
 * O símbolo sozinho é vetor, porque é laranja e foi vetorizado inteiro — e
 * favicon precisa escalar sem borrar.
 */

/** Play — traço exato do PLAY.svg do cliente. */
const PLAY =
  "M135 1343 c-72 -37 -124 -114 -125 -184 0 -20 11 -55 25 -80 95 -167 125 -264 125 -404 0 -141 -24 -219 -126 -405 -28 -51 -30 -95 -9 -148 34 -80 108 -127 190 -120 45 4 92 28 371 188 175 101 380 218 454 261 143 81 179 116 202 190 9 32 8 46 -6 84 -26 68 -57 98 -154 152 -48 27 -240 137 -427 245 -187 107 -359 205 -382 217 -48 24 -95 26 -138 4z";

/**
 * Símbolo sozinho: aba do navegador, lateral recolhida, avatar.
 * Herda a cor via `currentColor`.
 */
export function Simbolo({
  tamanho = 24,
  className = "",
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="-13.11 -7.98 152 152"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(0,136) scale(0.1,-0.1)" fill="currentColor">
        <path d={PLAY} />
      </g>
    </svg>
  );
}

/**
 * Lockup da GTA VIRAL. Proporção 774x100 ≈ 7,7:1.
 *
 * Agora é SVG, e a troca de PNG para vetor foi possível porque o letreiro
 * passou a ser desenhado (traço de tubo de néon com cantos chanfrados) em vez
 * de tipografado — não há mais texto branco a vetorizar, que era o problema do
 * lockup anterior.
 *
 * O nome do arquivo mudou junto com a marca, e isso não é enfeite: trocar o
 * conteúdo mantendo a URL faria o navegador de quem já visitou continuar
 * servindo a arte antiga do cache. Marca nova, nome novo — a URL é a chave de
 * invalidação.
 *
 * As dimensões precisam bater com o arquivo real: o next/image usa esse par
 * pra reservar o espaço antes da imagem chegar. Erradas, o layout salta
 * quando ela carrega.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/gta-viral.svg"
      alt={MARCA}
      width={774}
      height={100}
      priority
      // `unoptimized`: o otimizador do next/image não processa SVG, e mandá-lo
      // pelo pipeline só adiciona um salto de rede para devolver o mesmo byte.
      unoptimized
      className={"h-auto w-full " + className}
    />
  );
}
