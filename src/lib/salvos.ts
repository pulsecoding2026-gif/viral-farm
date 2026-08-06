import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ItemBiblioteca } from "./biblioteca/tipos";

/**
 * O acervo: os ativos que o usuário guardou e como ele os organizou.
 *
 * Duas camadas:
 *   - ATIVO — uma referência de formato (do Radar/Lives) ou uma análise do
 *     material dele (do Analisador). É a unidade guardável.
 *   - COLEÇÃO — o agrupamento. Reúne ativos em torno de um propósito: "série
 *     sobre fundo do mar" junta 4 referências e 1 análise.
 *
 * A Coleção existe porque é ela que alimenta o Planejar e o Criar. Sem esse
 * agrupamento a Biblioteca seria um arquivo morto — cada ativo isolado, sem
 * dizer o que virou nem o que vai virar.
 *
 * PROVISÓRIO, mesmo desenho de jobs.ts: persiste em JSON local, sem banco e
 * sem usuário. A troca por Supabase não deve vazar para a API nem para a UI.
 */

export type SalvoVideo = {
  tipo: "video";
  /** Reaproveita o id do item do Radar — evita salvar duplicado. */
  id: string;
  salvo_em: number;
  nota?: string;
  /** A qual coleção pertence. Ausente = ativo solto no acervo. */
  colecao_id?: string;
  video: ItemBiblioteca;
};

export type SalvoAnalise = {
  tipo: "analise";
  /** Id do job da análise. */
  id: string;
  salvo_em: number;
  nota?: string;
  colecao_id?: string;
  titulo: string;
  nicho: string;
  link: string;
  /** Quantos roteiros a análise gerou — evita recarregar o job só pra contar. */
  qtd_roteiros: number;
};

export type ItemSalvo = SalvoVideo | SalvoAnalise;

export type Colecao = {
  id: string;
  nome: string;
  /** O propósito da coleção: o que o usuário quer fazer com esse material. */
  nota?: string;
  emoji: string;
  criada_em: number;
};

const DIR = path.join(process.cwd(), "data");
const ARQ_SALVOS = path.join(DIR, "salvos.json");
const ARQ_COLECOES = path.join(DIR, "colecoes.json");

function ler<T>(arquivo: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
  } catch {
    return [];
  }
}

// Turbopack recarrega módulos em dev; sem o globalThis os mapas voltariam do
// disco a cada edição, perdendo o que ainda não foi gravado.
type Estado = {
  salvos: Map<string, ItemSalvo>;
  colecoes: Map<string, Colecao>;
};

const estado: Estado =
  (globalThis as { __viralxAcervo?: Estado }).__viralxAcervo ??
  ((globalThis as { __viralxAcervo?: Estado }).__viralxAcervo = {
    salvos: new Map(ler<ItemSalvo>(ARQ_SALVOS).map((i) => [i.id, i])),
    colecoes: new Map(ler<Colecao>(ARQ_COLECOES).map((c) => [c.id, c])),
  });

function gravar(arquivo: string, valores: unknown[]) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(valores), "utf-8");
}

const gravarSalvos = () => gravar(ARQ_SALVOS, [...estado.salvos.values()]);
const gravarColecoes = () => gravar(ARQ_COLECOES, [...estado.colecoes.values()]);

/* ------------------------------------------------------------------ ativos */

export function listarSalvos(): ItemSalvo[] {
  return [...estado.salvos.values()].sort((a, b) => b.salvo_em - a.salvo_em);
}

export function estaSalvo(id: string): boolean {
  return estado.salvos.has(id);
}

/** Salvar duas vezes o mesmo ativo é no-op, não erro — o botão é um alternador. */
export function salvar(item: Omit<ItemSalvo, "salvo_em">): ItemSalvo {
  const existente = estado.salvos.get(item.id);
  if (existente) return existente;

  const completo = { ...item, salvo_em: Date.now() } as ItemSalvo;
  estado.salvos.set(item.id, completo);
  gravarSalvos();
  return completo;
}

export function remover(id: string): boolean {
  const tinha = estado.salvos.delete(id);
  if (tinha) gravarSalvos();
  return tinha;
}

/**
 * Atualiza nota e/ou vínculo com uma coleção.
 * `colecao_id: null` desvincula — diferente de `undefined`, que não mexe.
 */
export function atualizarSalvo(
  id: string,
  campos: { nota?: string; colecao_id?: string | null },
): ItemSalvo | null {
  const item = estado.salvos.get(id);
  if (!item) return null;

  const atualizado = { ...item } as ItemSalvo;
  if (campos.nota !== undefined) {
    atualizado.nota = campos.nota.trim() || undefined;
  }
  if (campos.colecao_id !== undefined) {
    atualizado.colecao_id = campos.colecao_id ?? undefined;
  }

  estado.salvos.set(id, atualizado);
  gravarSalvos();
  return atualizado;
}

/* --------------------------------------------------------------- coleções */

export function listarColecoes(): Colecao[] {
  return [...estado.colecoes.values()].sort((a, b) => b.criada_em - a.criada_em);
}

export function criarColecao(
  nome: string,
  emoji = "💡",
  nota?: string,
): Colecao {
  const colecao: Colecao = {
    id: randomUUID(),
    nome: nome.trim() || "Sem nome",
    emoji,
    nota: nota?.trim() || undefined,
    criada_em: Date.now(),
  };
  estado.colecoes.set(colecao.id, colecao);
  gravarColecoes();
  return colecao;
}

export function atualizarColecao(
  id: string,
  campos: { nome?: string; nota?: string; emoji?: string },
): Colecao | null {
  const colecao = estado.colecoes.get(id);
  if (!colecao) return null;

  const atualizada: Colecao = {
    ...colecao,
    ...(campos.nome !== undefined
      ? { nome: campos.nome.trim() || colecao.nome }
      : {}),
    ...(campos.emoji !== undefined ? { emoji: campos.emoji } : {}),
    ...(campos.nota !== undefined
      ? { nota: campos.nota.trim() || undefined }
      : {}),
  };
  estado.colecoes.set(id, atualizada);
  gravarColecoes();
  return atualizada;
}

/**
 * Apagar a coleção NÃO apaga os ativos dentro dela — eles voltam para o
 * acervo. Perder referência salva por causa de uma reorganização seria
 * destrutivo demais para um clique só.
 */
export function removerColecao(id: string): boolean {
  const tinha = estado.colecoes.delete(id);
  if (!tinha) return false;

  for (const [chave, item] of estado.salvos) {
    if (item.colecao_id === id) {
      estado.salvos.set(chave, { ...item, colecao_id: undefined });
    }
  }
  gravarColecoes();
  gravarSalvos();
  return true;
}
