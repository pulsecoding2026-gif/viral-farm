import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { acharModulo, SLUGS_PLACEHOLDER } from "@/lib/modulos";
import { ModuloPlaceholder } from "../modulo-placeholder";

/**
 * Rota única para todo módulo do registro que ainda não tem página própria.
 *
 * Segmento estático ganha de dinâmico no App Router, então /analisador,
 * /biblioteca e /banco-de-videos seguem servindo as páginas reais — o catch-all
 * só atende o que sobra. Slug fora do registro cai em notFound() em vez de
 * inventar uma tela.
 */

export function generateStaticParams() {
  return SLUGS_PLACEHOLDER.map((modulo) => ({ modulo }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modulo: string }>;
}): Promise<Metadata> {
  const { modulo } = await params;
  const encontrado = acharModulo(modulo);
  // O sufixo da marca vem do template em layout.tsx — não repetir aqui.
  return { title: encontrado?.rotulo };
}

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const encontrado = acharModulo(modulo);

  // Módulo inexistente, ou que já tem rota real (não deveria chegar aqui).
  if (!encontrado || encontrado.pronto) notFound();

  return <ModuloPlaceholder modulo={encontrado} />;
}
