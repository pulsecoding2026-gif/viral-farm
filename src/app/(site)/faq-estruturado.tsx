import { grafoDoFaq } from "@/lib/gta/seo";

/**
 * O FAQ em dado estruturado — para ser montado SÓ na home.
 *
 * FALTA UMA LINHA PARA ISTO ENTRAR NO AR. Em `src/app/(site)/page.tsx`:
 *
 *     import { FaqEstruturado } from "./faq-estruturado";
 *     ...
 *     <Perguntas />
 *     <FaqEstruturado />
 *
 * Não fiz essa edição porque `page.tsx` estava sendo alterado por outro agente
 * no mesmo momento, e conflito de escrita custa mais caro que uma linha
 * pendente. Está registrado como o primeiro item de `docs/gta/seo.md`.
 *
 * POR QUE UM COMPONENTE SEPARADO, E NÃO NO LAYOUT DO GRUPO
 *
 * Porque o layout roda em `/termos`, `/politica`, `/entrar` e `/cadastro`
 * também, e nenhuma dessas telas mostra o FAQ. A regra do Google não é sobre
 * intenção: o conteúdo marcado precisa estar visível na mesma página. FAQ
 * marcado onde não há FAQ é o caminho mais curto para uma ação manual de dado
 * estruturado — que derruba TODO o rich result do domínio, não só o do FAQ.
 *
 * UMA EXPECTATIVA A CALIBRAR: desde agosto de 2023 o Google só exibe o rich
 * result de FAQ para sites de governo e de saúde. Este bloco não vai render
 * sanfona no resultado de busca. O que ele ainda faz — e por isso vale — é
 * entregar pergunta e resposta em formato limpo para os buscadores menores e
 * para os assistentes de IA, que hoje são um caminho real de descoberta para
 * quem procura "como montar canal de cortes".
 *
 * O texto vem de `seo.ts`, que é cópia palavra por palavra de `perguntas.tsx`.
 * Se o FAQ da tela mudar, aquele arquivo muda junto — senão a marcação passa a
 * descrever uma página que não existe mais.
 */
export function FaqEstruturado() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(grafoDoFaq()) }}
    />
  );
}
