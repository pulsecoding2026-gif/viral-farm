import type { Live } from "./tipos";

/**
 * Filtro por franquia GTA — aplicado DEPOIS que `radarDeLives()` já trouxe os
 * dados. Não mexe em cache, token nem chamada de API (isso continua em
 * `radar-lives.ts`, intocado): é "cortar o resultado", não "buscar diferente".
 *
 * Por que franquia e não "GTA VI": o jogo lança em 19/11/2026 e não existe
 * gameplay dele em lugar nenhum hoje — nem live, nem VOD (ver
 * docs/gta/pesquisa-jogo.md e docs/gta/plano-mestre.md §2). Filtrar por
 * "GTA VI" devolveria lista vazia sempre, e lista vazia no primeiro minuto de
 * quem acabou de assinar é o pior resultado possível. A ponte até lá é GTA V
 * e RP: é o material que existe hoje, é a mesma habilidade de corte que serve
 * pro dia 19/11, e é onde os canais de GTA no Brasil já vivem.
 *
 * Twitch e Kick relatam a categoria como texto livre (`categoria`), não como
 * um ID estável — por isso o filtro é por texto, não por comparação de ID.
 * Cobre "Grand Theft Auto V" (categoria oficial da Twitch, usada também pelos
 * servidores de RP e por GTA Online) e a sigla "GTA" isolada, que streamers
 * às vezes escrevem sozinha no título da própria categoria.
 */
const PADRAO_FRANQUIA_GTA = /grand\s*theft\s*auto|\bgta\b/i;

/** Verdadeiro se a live pertence à franquia GTA (V, Online ou RP). */
export function ehDaFranquiaGta(live: Pick<Live, "categoria">): boolean {
  return PADRAO_FRANQUIA_GTA.test(live.categoria);
}

/** Só as lives da franquia GTA, na mesma ordem em que chegaram. */
export function filtrarFranquiaGta(lives: Live[]): Live[] {
  return lives.filter(ehDaFranquiaGta);
}
