"use client";

/**
 * Os atalhos de teclado do editor.
 *
 * Editor de vídeo sem atalho é editor que ninguém usa duas vezes: dividir,
 * apagar e desfazer acontecem centenas de vezes por sessão, e cada uma delas
 * pelo mouse é uma viagem até a barra de ferramentas.
 *
 * A REGRA QUE NÃO PODE FALHAR: atalho não dispara com o foco num campo de
 * texto. Sem isso, escrever "isso" numa legenda dividiria o clipe duas vezes,
 * e um Backspace corrigindo uma letra apagaria o item selecionado. É o bug que
 * transforma o recurso em armadilha, e por isso ele é a primeira coisa que a
 * função checa.
 *
 * O mapa é escrito como a pessoa fala:
 *
 *   useAtalhos({
 *     s: dividir,
 *     Delete: remover,
 *     "ctrl+z": desfazer,
 *     "ctrl+shift+z": refazer,
 *     space: alternar,
 *     "+": aproximar,
 *     ArrowLeft: () => irPara(agora - 1 / 30),
 *   });
 *
 * Maiúscula/minúscula não importa (`Delete` e `delete` são a mesma chave), e a
 * ordem dos modificadores também não (`shift+ctrl+z` acha `ctrl+shift+z`).
 */

import { useEffect, useRef } from "react";

/** Ordem canônica dos modificadores na chave: ctrl, alt, shift, tecla. */
function montarChave(m: {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  tecla: string;
}): string {
  const partes: string[] = [];
  if (m.ctrl) partes.push("ctrl");
  if (m.alt) partes.push("alt");
  if (m.shift) partes.push("shift");
  partes.push(m.tecla);
  return partes.join("+");
}

/**
 * A chave escrita pelo chamador, na forma canônica.
 *
 * `cmd`, `meta` e `mod` viram `ctrl`: o mesmo mapa tem que servir pro Mac, onde
 * desfazer é Cmd+Z. Escrever os dois em todo lugar seria mapa em dobro.
 */
export function normalizarAtalho(bruto: string): string {
  const cru = bruto.trim().toLowerCase();
  if (cru === "") return "";
  // "+" é a própria tecla de aproximar, não o separador.
  if (cru === "+") return "+";

  const partes = cru.split("+");
  let tecla = partes.pop() ?? "";
  // "ctrl++" termina em pedaço vazio: a tecla ali é o "+".
  if (tecla === "") tecla = "+";
  if (tecla === " ") tecla = "space";

  const mods = new Set(partes.filter((p) => p !== ""));
  return montarChave({
    ctrl: mods.has("ctrl") || mods.has("cmd") || mods.has("meta") || mods.has("mod"),
    alt: mods.has("alt") || mods.has("option"),
    shift: mods.has("shift"),
    tecla,
  });
}

/** A chave que o evento representa, ou `null` quando não é atalho nenhum. */
function chaveDoEvento(e: KeyboardEvent): string | null {
  let tecla = e.key === " " || e.key === "Spacebar" ? "space" : e.key;
  tecla = tecla.toLowerCase();

  // Segurar Ctrl também dispara keydown com key="Control". Modificador sozinho
  // não é atalho, e tecla morta (acento do ABNT2) menos ainda.
  if (
    tecla === "control" ||
    tecla === "shift" ||
    tecla === "alt" ||
    tecla === "meta" ||
    tecla === "os" ||
    tecla === "dead" ||
    tecla === "unidentified"
  ) {
    return null;
  }

  // O shift só entra na chave quando NÃO está embutido no caractere. No teclado
  // ABNT2 (e no americano) "+" é Shift+=, e "?" é Shift+/: o navegador já
  // entrega o caractere final. Repetir o shift na chave faria o atalho "+" ser
  // procurado como "shift++" e nunca casar. Para letra e para tecla nomeada
  // (Delete, ArrowLeft, F5) o shift é informação de verdade e fica.
  const ehLetra = tecla.length === 1 && tecla >= "a" && tecla <= "z";
  const shift = e.shiftKey && (ehLetra || tecla.length > 1);

  return montarChave({
    // Cmd no Mac é o Ctrl do resto do mundo.
    ctrl: e.ctrlKey || e.metaKey,
    alt: e.altKey,
    shift,
    tecla,
  });
}

/**
 * Onde o atalho tem que ficar quieto.
 *
 * `isContentEditable` cobre também o filho de um bloco editável — o foco
 * costuma estar num <span> lá dentro, e olhar só a tag deixaria passar.
 */
function emCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  if (alvo.isContentEditable) return true;
  const tag = alvo.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Procura a ação percorrendo as chaves do mapa já normalizadas.
 *
 * Percorrer em vez de indexar é de propósito: `mapa["constructor"]` devolveria
 * uma função herdada do protótipo, e o atalho chamaria o construtor de Object.
 * São uma dúzia de chaves — o custo por tecla é irrelevante.
 */
function acharAcao(
  mapa: Record<string, () => void>,
  chave: string,
): (() => void) | null {
  for (const nome of Object.keys(mapa)) {
    if (normalizarAtalho(nome) !== chave) continue;
    const acao = mapa[nome];
    if (typeof acao === "function") return acao;
  }
  return null;
}

/**
 * Liga o mapa de atalhos na janela enquanto `ativo`.
 *
 * O mapa é recriado a cada renderização (as ações fecham sobre o estado atual),
 * então ele vive numa ref e o ouvinte é registrado UMA vez. Reassinar o
 * `keydown` a cada renderização funcionaria, mas perderia a tecla pressionada
 * no meio da troca e sujaria o perfil de eventos numa tela que já roda um
 * `requestAnimationFrame` por quadro.
 *
 * `preventDefault` só quando o atalho existe no mapa — engolir Ctrl+C ou a
 * barra de espaço que a página não usa quebraria o navegador debaixo do
 * usuário. Quando o atalho EXISTE, engolir é o certo: sem isso a barra de
 * espaço rolaria a página, e um botão com foco receberia o clique além da ação.
 */
export function useAtalhos(mapa: Record<string, () => void>, ativo = true) {
  const mapaRef = useRef(mapa);
  useEffect(() => {
    mapaRef.current = mapa;
  });

  useEffect(() => {
    if (!ativo) return;

    function aoTeclar(e: KeyboardEvent) {
      // Composição de IME/acento em andamento: a tecla ainda vai virar outra
      // coisa e não é atalho.
      if (e.isComposing) return;
      if (emCampoDeTexto(e.target)) return;

      const chave = chaveDoEvento(e);
      if (chave === null) return;

      const acao = acharAcao(mapaRef.current, chave);
      if (!acao) return;

      e.preventDefault();
      acao();
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [ativo]);
}
