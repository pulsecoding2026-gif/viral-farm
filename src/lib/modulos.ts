/**
 * Registro central da navegação.
 *
 * A lateral tem CINCO blocos fixos e nada mais. A profundidade não vira item
 * de menu: vira aba dentro da página. Com poucos módulos, acordeão na lateral
 * só esconde coisa e cobra um clique a mais — o menu precisa ser uma espinha
 * estável, previsível, que não muda de altura enquanto o usuário navega.
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
 *   Descobrir → o que funciona, lá fora e no meu próprio material
 *   Planejar  → escrevo roteiro, hook e título com IA
 *   Criar     → monto o vídeo de verdade
 *   Viralizar → publico e vejo o que deu certo
 *
 * Dentro de Descobrir a ordem também é a do trabalho:
 *   Analisador  → analiso o MEU material
 *   Radar Viral → vejo o que está em alta LÁ FORA, por categoria
 *   Biblioteca  → guardo o que interessa dos dois, pra usar depois
 *
 * Os quatro blocos são verbos na ordem em que o trabalho acontece. O último
 * chama Viralizar, não Workspace, porque nomeia o objetivo do usuário e não
 * a ferramenta — e porque era a única palavra em inglês do menu.
 *
 * O Analisador mora em Descobrir porque o trabalho dele é diagnóstico: ler o
 * material bruto e dizer o que dá pra aproveitar. O Voice Viral mora em Criar
 * porque a saída dele é asset pronto, não plano.
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

export const SECOES: Secao[] = [
  {
    id: "descobrir",
    rotulo: "Descobrir",
    descricao: "O que funciona lá fora — e de onde dá pra tirar o próximo corte",
    icone: "Compass",
    modulos: [
      {
        slug: "analisador",
        rotulo: "Analisador",
        resumo: "Vídeo longo vira cortes 9:16 prontos pra postar",
        icone: "MagnifyingGlass",
        cor: "from-orange-500 to-amber-600",
        pronto: true,
        principal: true,
      },
      {
        // Antes do Radar de propósito: Trends é DEMANDA (sobre o que falar),
        // o Radar é OFERTA (em que formato). Escolher o assunto vem primeiro.
        slug: "trends",
        rotulo: "Trends",
        resumo: "O que estão pesquisando e comentando agora",
        icone: "TrendUp",
        cor: "from-fuchsia-500 to-purple-600",
        pronto: true,
      },
      {
        slug: "radar-viral",
        rotulo: "Radar Viral",
        resumo: "O que está em alta agora, por categoria",
        icone: "Target",
        cor: "from-cyan-500 to-blue-600",
        pronto: true,
      },
      {
        // Fonte de matéria-prima: onde tem gente assistindo ao vivo, tem corte
        // acontecendo. Fica ao lado do Radar porque as duas telas respondem
        // "de onde tiro conteúdo agora", só que em tempos diferentes.
        slug: "lives",
        rotulo: "Lives",
        resumo: "Quem está com mais audiência ao vivo agora",
        icone: "Broadcast",
        cor: "from-purple-500 to-fuchsia-600",
        pronto: true,
      },
      {
        // Terceira de propósito: a Biblioteca é o depósito do trabalho feito
        // nas duas primeiras. Só faz sentido depois de existir o que guardar.
        slug: "biblioteca",
        rotulo: "Biblioteca",
        resumo: "O que você salvou do Analisador e do Radar",
        icone: "BookmarkSimple",
        cor: "from-blue-500 to-indigo-600",
        pronto: true,
      },
    ],
  },
  {
    id: "planejar",
    rotulo: "Planejar",
    descricao: "Roteiro, hooks, títulos e capa — escritos com IA",
    icone: "NotePencil",
    modulos: [
      {
        slug: "agent-viral",
        rotulo: "Agent Viral",
        resumo: "Converse e resolva qualquer peça do vídeo na hora",
        icone: "ChatCircleDots",
        cor: "from-orange-500 to-rose-600",
        // "Analisar o canal na conversa" saiu da lista: o agente não navega,
        // e prometer scraping que não existe é mentira que a pessoa descobre
        // na segunda pergunta. Ele PEDE os dados colados e analisa em cima.
        pronto: true,
      },
      {
        slug: "roteiros",
        rotulo: "Roteiros",
        resumo: "Roteiro completo a partir de um tema ou referência",
        icone: "Scroll",
        cor: "from-amber-500 to-orange-600",
        pronto: true,
      },
      {
        slug: "hooks",
        rotulo: "Hooks",
        resumo: "Os primeiros segundos que seguram o dedo",
        icone: "Lightning",
        cor: "from-yellow-400 to-amber-500",
        pronto: true,
      },
    ],
  },
  {
    id: "criar",
    rotulo: "Criar",
    descricao: "Monte o vídeo: cortes, narração e imagens de apoio",
    icone: "MagicWand",
    modulos: [
      {
        // Era "Clip AI", e o que ele prometia (achar os melhores momentos,
        // cortar em 9:16, legendar, tirar silêncio) o Analisador JÁ faz —
        // eram o mesmo produto com dois nomes. Aqui vive a outra metade: o
        // ajuste na mão do que a automação entregou.
        slug: "editor-viral",
        rotulo: "Editor Viral IA",
        resumo: "Abra um corte e ajuste na mão: tempo, legenda, formato",
        icone: "Scissors",
        cor: "from-blue-500 to-sky-600",
        pronto: true,
      },
      {
        slug: "voice-viral",
        rotulo: "Voice Viral",
        resumo: "Narração, clonagem e tradução de voz",
        icone: "Waveform",
        cor: "from-amber-400 to-yellow-500",
        recursos: [
          "Transformar o roteiro do Analisador em narração pronta",
          "Clonar a sua própria voz a partir de uma amostra curta",
          "Traduzir a narração mantendo o timbre",
          "Ajustar emoção, tom e ritmo por trecho",
          "Voz econômica para rascunho e premium para o vídeo final",
        ],
      },
      {
        slug: "banco-de-videos",
        rotulo: "Banco de Vídeos",
        resumo: "Clipes livres pra baixar e usar no seu vídeo",
        icone: "VideoCamera",
        cor: "from-rose-500 to-red-600",
        pronto: true,
      },
    ],
  },
  {
    id: "viralizar",
    rotulo: "Viralizar",
    descricao: "Seus canais conectados, o que já foi ao ar e o que deu resultado",
    icone: "Broadcast",
    modulos: [
      {
        slug: "redes-sociais",
        rotulo: "Redes Sociais",
        resumo: "Suas contas conectadas e a publicação em todas elas",
        icone: "ShareNetwork",
        cor: "from-sky-500 to-indigo-600",
        subs: [
          {
            slug: "conexoes",
            rotulo: "Conexões",
            resumo: "Conecte TikTok, Instagram e YouTube numa conta só",
            icone: "PlugsConnected",
            cor: "from-sky-500 to-indigo-600",
            recursos: [
              "Conectar e desconectar contas por plataforma",
              "Ver limites e permissões de cada conta conectada",
              "Trocar de perfil sem sair do painel",
              "Status de saúde da conexão, com aviso quando o token expira",
            ],
          },
          {
            slug: "publicar",
            rotulo: "Publicar",
            resumo: "Publique e agende para todas as redes de uma vez",
            icone: "PaperPlaneTilt",
            cor: "from-emerald-500 to-teal-600",
            recursos: [
              "Publicação simultânea nas redes conectadas",
              "Título, descrição e hashtags sugeridos a partir da análise",
              "Agendamento por melhor horário do nicho",
              "Calendário único do que já foi e do que ainda vai ao ar",
              "Fila de publicação com reordenação",
            ],
          },
        ],
      },
      {
        slug: "viralytics",
        rotulo: "Viralytics",
        resumo: "Views, retenção e CTR de tudo que você publicou",
        icone: "ChartLineUp",
        cor: "from-cyan-500 to-blue-600",
        recursos: [
          "Views, curtidas, comentários e seguidores por canal",
          "Curva de retenção com o ponto exato da queda",
          "CTR por capa e por título",
          "Comparativo entre os seus vídeos e com a média do nicho",
          "Ligação entre a análise feita e o resultado real",
        ],
      },
      {
        slug: "concorrentes",
        rotulo: "Concorrentes",
        resumo: "Espione perfis e veja o que rompeu a média deles",
        icone: "Detective",
        cor: "from-purple-500 to-fuchsia-600",
        recursos: [
          "Adicionar canais e perfis do nicho para monitorar",
          "Destaque dos vídeos que romperam a média histórica",
          "Frequência e horário de postagem de cada concorrente",
          "Leitura do padrão: gancho, formato e tema que se repetem",
          "Alerta quando um concorrente emplaca um vídeo fora da curva",
        ],
      },
    ],
  },
];

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
