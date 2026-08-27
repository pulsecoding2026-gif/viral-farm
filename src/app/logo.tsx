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
 * Lockup da GTA VIRAL — a arte do dono. Proporção 2056x765 ≈ 2,7:1.
 *
 * ATENÇÃO AO TROCAR ISTO POR OUTRA ARTE: a proporção mudou muito. O lockup
 * anterior era 7,7:1 (uma faixa comprida e baixa), este é 2,7:1 — quase três
 * vezes mais alto para a mesma largura. Todo lugar que reservava altura para o
 * logo com um `max-w` precisou ser reconferido, porque com a mesma largura ele
 * passou a ocupar o triplo da altura e empurrava o cabeçalho.
 *
 * SEM `unoptimized`, ao contrário do SVG que estava aqui antes: o arquivo
 * original tem 1,3 MB, e é justamente esse o caso em que o otimizador do
 * next/image ganha o seu salário — ele serve WebP redimensionado para o
 * tamanho pedido. Mandar 1,3 MB para desenhar um logo de 126px de largura
 * seria pagar a banda inteira para jogar 99% dela fora.
 *
 * As dimensões precisam bater com o arquivo real: o next/image usa esse par
 * para reservar o espaço antes da imagem chegar. Erradas, o layout salta
 * quando ela carrega.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Image
      /*
       * `-v2` no nome, e não substituir o arquivo anterior: a URL é a chave de
       * cache do navegador. Trocar o conteúdo mantendo `/logo-gta-viral.png`
       * faria quem já visitou continuar vendo a arte antiga, e esse é o tipo de
       * bug que só aparece para os outros — nunca para quem acabou de mexer.
       */
      src="/logo-gta-viral-v3.png"
      alt={MARCA}
      width={1774}
      height={887}
      priority
      className={"h-auto w-full " + className}
    />
  );
}
