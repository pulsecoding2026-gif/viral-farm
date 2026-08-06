import type { Metadata } from "next";
import { PainelBiblioteca } from "./painel-biblioteca";
import { listarSalvos, listarColecoes } from "@/lib/salvos";

export const metadata: Metadata = { title: "Biblioteca" };

// Lê o acervo do disco a cada visita. Sem isto o Next pré-renderiza a página
// no build e ela congela: salvar algo no Radar nunca apareceria aqui.
export const dynamic = "force-dynamic";

export default function BibliotecaPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Biblioteca
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-500">
          Seu acervo. Referências de formato salvas no Radar e nas Lives, mais
          as análises do seu material — organizadas em coleções. É daqui que sai
          o que você vai planejar e criar.
        </p>
      </header>

      <PainelBiblioteca
        salvosIniciais={listarSalvos()}
        colecoesIniciais={listarColecoes()}
      />
    </div>
  );
}
