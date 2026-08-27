/**
 * Registro central da navegação.
 *
 * A lateral tem DOIS blocos fixos e nada mais (ver `docs/gta/plano-mestre.md`
 * §5 — 15 módulos em 4 blocos viraram 5 módulos em 2). A profundidade não vira
 * item de menu: vira aba dentro da página. Com poucos módulos, acordeão na
 * lateral só esconde coisa e cobra um clique a mais — o menu precisa ser uma
 * espinha estável, previsível, que não muda de altura enquanto o usuário
 * navega.
 *
 * São três níveis, e cada um mora num lugar diferente da tela:
 *
 *   bloco    → lateral fixa
 *   módulo   → primeira fileira de abas, no topo da página
 *   submenu  → segunda fileira de abas, abaixo da primeira
 *
 * Os blocos são verbos numa linha do tempo, não categorias de tecnologia —
 * a ordem do menu é a ordem em que o trabalho acontece:
 *
 *   Dashboard → onde eu começo
 *   Descobrir → de onde tiro o material (Lives, depois Radar Viral)
 *   Criar     → do link ao Short pronto (Analisador, Editor, Biblioteca)
 *
 * LIVES VEM ANTES DE RADAR VIRAL dentro de Descobrir, e é a virada mais
 * importante do menu: o público antigo chegava com vídeo próprio na mão e ia
 * direto ao Analisador; o novo chega sem nada e precisa de matéria-prima antes
 * de precisar de máquina — ver detalhe no comentário de `SECOES` abaixo.
 *
 * `pronto: true` significa que existe rota real em src/app/<slug>/, que ganha
 * do catch-all `[modulo]` (segmento estático vence dinâmico no App Router).
 */

export type Modulo = {
  slug: string;
  rotulo: string;
  /** Frase curta do card e do cabeçalho. */
  resumo: string;
  icone: string;
  /** Gradiente Tailwind do quadrado do ícone. */
  cor: string;
  pronto?: boolean;
  /** Carro-chefe do produto — ganha destaque. */
  principal?: boolean;
  recursos?: string[];
  /**
   * Submenu, quando o módulo agrupa telas irmãs. Um módulo com `subs` não é
   * rota: o slug dele serve só de identidade, e clicar nele leva ao primeiro
   * filho. O submenu aparece como segunda fileira de abas dentro da página.
   */
  subs?: Modulo[];
};

export type Secao = {
  /** Identidade do bloco. Não é segmento de URL: as rotas seguem planas. */
  id: string;
  rotulo: string;
  /** Uma linha que explica o bloco pra quem chegou agora. */
  descricao: string;
  icone: string;
  /** As abas do bloco. A primeira é o destino ao clicar na lateral. */
  modulos: Modulo[];
};

/**
 * O MENU DA GTA VIRAL — cinco módulos, dois blocos.
 *
 * Eram quinze módulos em quatro blocos, herdados da ferramenta genérica. A
 * virada para o nicho cortou dez, com um critério só: **este módulo ajuda
 * alguém a publicar um corte de GTA hoje?**
 *
 * O que saiu do menu NÃO foi apagado — Trends, Agent Viral, Roteiros, Hooks,
 * Voice Viral, Banco de Vídeos, Redes Sociais, Viralytics e Concorrentes
 * continuam em `src/app/`. Módulo fora do menu não atrapalha ninguém e volta
 * com uma linha; módulo apagado é trabalho pago jogado fora por uma sensação
 * de limpeza.
 *
 * LIVES É A PRIMEIRA TELA, e é a mudança de ordem que mais importa. Antes o
 * Analisador abria o painel. Só que o novo usuário chega SEM VÍDEO NENHUM: ele
 * não é o streamer que cliba a si mesmo, é quem quer montar canal de cortes
 * sem aparecer. A primeira pergunta dele não é "como corto", é "de onde tiro
 * material" — e abrir num campo de link vazio responde a pergunta errada.
 */
export const SECOES: Secao[] = [
  {
    id: "descobrir",
    rotulo: "Descobrir",
    descricao: "De onde sai o próximo corte",
    icone: "Compass",
    modulos: [
      {
        slug: "lives",
        rotulo: "Lives",
        resumo: "Quem está ao vivo agora — a matéria-prima do seu canal",
        icone: "Broadcast",
        cor: "from-purple-500 to-fuchsia-600",
        pronto: true,
      },
      {
        slug: "radar-viral",
        rotulo: "Radar Viral",
        resumo: "O corte que está performando agora, e por quê",
        icone: "Target",
        cor: "from-cyan-500 to-blue-600",
        pronto: true,
      },
    ],
  },
  {
    id: "criar",
    rotulo: "Criar",
    descricao: "Do link ao Short pronto",
    icone: "MagicWand",
    modulos: [
      {
        slug: "analisador",
        rotulo: "Analisador",
        resumo: "Cole a live e receba os cortes 9:16 legendados",
        icone: "MagnifyingGlass",
        cor: "from-orange-500 to-amber-600",
        pronto: true,
        principal: true,
      },
      {
        slug: "editor-viral",
        rotulo: "Editor",
        resumo: "Ajuste na mão o que a IA entregou: tempo, legenda, formato",
        icone: "Scissors",
        cor: "from-blue-500 to-sky-600",
        pronto: true,
      },
      {
        slug: "biblioteca",
        rotulo: "Biblioteca",
        resumo: "Seus cortes salvos, prontos pra baixar e postar",
        icone: "BookmarkSimple",
        cor: "from-fuchsia-500 to-purple-600",
        pronto: true,
      },
    ],
  },
];

/*
 * O BLOCO "VIRALIZAR" SAIU DAQUI — Redes Sociais, Viralytics e Concorrentes.
 *
 * Eram promessas da ferramenta genérica que dependem de integração com TikTok,
 * Instagram e YouTube. A do TikTok está em análise de aprovação; as outras não
 * existem. Anunciar no menu o que não funciona é o jeito mais rápido de perder
 * a confiança de quem acabou de assinar — e este produto vive de credibilidade
 * num fandom que confere tudo.
 *
 * As telas continuam no repositório. No dia em que a integração for aprovada,
 * o bloco volta com um `git revert` deste commit.
 */

/**
 * Conta e configurações. Fica fora de SECOES de propósito: não é navegação de
 * produto, é navegação de conta — mora no rodapé da lateral, não nos blocos.
 */
export const SECAO_CONTA: Secao = {
  id: "conta",
  rotulo: "Configurações",
  descricao: "Seus dados, seu acesso e as preferências do painel",
  icone: "Gear",
  modulos: [
    {
      slug: "perfil",
      rotulo: "Perfil",
      resumo: "Nome, foto e informações públicas",
      icone: "User",
      cor: "from-sky-500 to-blue-600",
      pronto: true,
    },
    {
      slug: "seguranca",
      rotulo: "Segurança",
      resumo: "E-mail de acesso e senha",
      icone: "Lock",
      cor: "from-emerald-500 to-teal-600",
      pronto: true,
    },
    {
      slug: "preferencias",
      rotulo: "Preferências",
      resumo: "Notificações e ajustes do painel",
      icone: "SlidersHorizontal",
      cor: "from-violet-500 to-purple-600",
      pronto: true,
    },
  ],
};

/** Todas as seções navegáveis — produto e conta. */
const TODAS_SECOES: Secao[] = [...SECOES, SECAO_CONTA];

/**
 * Só as folhas — os módulos que de fato viram tela. Um módulo com `subs` é
 * agrupador: ele não tem rota própria, quem tem são os filhos.
 */
export const TODOS_MODULOS: Modulo[] = TODAS_SECOES.flatMap((s) =>
  s.modulos.flatMap((m) => m.subs ?? [m]),
);

export function acharModulo(slug: string): Modulo | undefined {
  return TODOS_MODULOS.find((m) => m.slug === slug);
}

/** Seção que contém um dado slug, em qualquer profundidade. */
export function acharSecao(slug: string): Secao | undefined {
  return TODAS_SECOES.find((s) =>
    s.modulos.some(
      (m) => m.slug === slug || m.subs?.some((sub) => sub.slug === slug),
    ),
  );
}

/** Módulo agrupador de um slug de submenu — undefined se o slug for de topo. */
export function acharPai(slug: string): Modulo | undefined {
  for (const secao of TODAS_SECOES) {
    for (const m of secao.modulos) {
      if (m.subs?.some((sub) => sub.slug === slug)) return m;
    }
  }
  return undefined;
}

/** Destino ao clicar num módulo: ele mesmo, ou o primeiro filho se agrupar. */
export function destinoDoModulo(m: Modulo): string {
  return "/" + (m.subs?.[0].slug ?? m.slug);
}

/** Destino ao clicar num bloco da lateral: a primeira aba dele. */
export function destinoDaSecao(secao: Secao): string {
  return destinoDoModulo(secao.modulos[0]);
}

/** Só os que ainda não têm rota real — são estes que o catch-all atende. */
export const SLUGS_PLACEHOLDER: string[] = TODOS_MODULOS.filter(
  (m) => !m.pronto,
).map((m) => m.slug);
