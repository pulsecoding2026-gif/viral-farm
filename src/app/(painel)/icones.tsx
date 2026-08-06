import type { Icon } from "@phosphor-icons/react";
import {
  House,
  Compass,
  NotePencil,
  MagicWand,
  Sparkle,
  Broadcast,
  MagnifyingGlass,
  FilmSlate,
  Target,
  TrendUp,
  BookmarkSimple,
  Package,
  Stack,
  ChatCircleDots,
  Scroll,
  Lightning,
  Scissors,
  Waveform,
  VideoCamera,
  ShareNetwork,
  PlugsConnected,
  PaperPlaneTilt,
  ChartLineUp,
  Detective,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Mapa nome -> componente. O registro em src/lib/modulos.ts guarda só a
 * string do ícone (ele é importado por Server e Client Components, e não
 * pode carregar componente junto); a resolução acontece aqui.
 */
const ICONES: Record<string, Icon> = {
  House,
  Compass,
  NotePencil,
  MagicWand,
  Sparkle,
  Broadcast,
  MagnifyingGlass,
  FilmSlate,
  Target,
  TrendUp,
  BookmarkSimple,
  Package,
  Stack,
  ChatCircleDots,
  Scroll,
  Lightning,
  Scissors,
  Waveform,
  VideoCamera,
  ShareNetwork,
  PlugsConnected,
  PaperPlaneTilt,
  ChartLineUp,
  Detective,
};

/** Cai no Sparkle se o nome não existir, pra um typo não derrubar a tela. */
export function icone(nome: string): Icon {
  return ICONES[nome] ?? Sparkle;
}
