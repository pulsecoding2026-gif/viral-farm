import { ClipesGrid } from "../clipes-grid";
import { bancoViral } from "@/lib/viral/pexels";
import { CLIPES_EXEMPLO } from "@/lib/viral/clipes-exemplo";

// O banco tem cache próprio de 7 dias. Se a página fosse estática, a busca
// aconteceria uma vez no build e o cache nunca mais rodaria.
export const dynamic = "force-dynamic";

export default async function BancoDeVideosPage() {
  let clipes = CLIPES_EXEMPLO;
  let aviso =
    "Prévia com dados de exemplo. Configure PEXELS_API_KEY em .env.local pra baixar clipes de verdade.";

  try {
    const banco = await bancoViral();
    clipes = banco.clipes;
    aviso =
      banco.fonte === "cache"
        ? "Banco real do Pexels (cache de até 7 dias)."
        : "Banco real do Pexels, atualizado agora.";
  } catch (err) {
    console.error("[viral] banco indisponível, caindo pros dados de exemplo:", err);
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Banco de Vídeos
        </h1>
        <p className="mt-2 max-w-[60ch] text-base text-zinc-600 dark:text-zinc-400">
          Clipes prontos pra baixar e colocar no seu vídeo: cenas que prendem
          o olho, licenciadas pra uso livre, sem precisar de crédito.
        </p>
        <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-600">{aviso}</p>
      </header>

      <ClipesGrid clipesIniciais={clipes} />
    </div>
  );
}
