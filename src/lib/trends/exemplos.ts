import type { TermoTrend } from "./tipos";

/**
 * Dados fictícios, para a tela ficar navegável antes das fontes existirem.
 *
 * A página avisa que é exemplo. Os termos foram espalhados ao longo de 30
 * dias pra que os filtros de período tenham o que separar de verdade — não é
 * a mesma lista repetida com outro rótulo. O volume por fonte também segue a
 * escala real de cada uma: hashtag tem ordem de milhões, X tem dezenas de
 * milhares, e comparar as duas no mesmo eixo não faria sentido.
 */
export const TERMOS_EXEMPLO: TermoTrend[] = [
  /* ------------------------------------------------------------- google */
  { id: "g1", termo: "como ganhar massa muscular em casa", fonte: "google", volume: 246_000, variacao_pct: 38, categoria: "fitness", dias_atras: 0 },
  { id: "g2", termo: "receita air fryer fácil", fonte: "google", volume: 512_000, variacao_pct: 12, categoria: "culinária", dias_atras: 0 },
  { id: "g3", termo: "quanto rende 1000 reais no cdb", fonte: "google", volume: 167_000, variacao_pct: 84, categoria: "finanças pessoais", dias_atras: 0 },
  { id: "g4", termo: "peixe abissal existe mesmo", fonte: "google", volume: 88_000, variacao_pct: 156, categoria: "mar e vida marinha", dias_atras: 0 },
  { id: "g5", termo: "carro elétrico vale a pena 2026", fonte: "google", volume: 194_000, variacao_pct: 41, categoria: "automotivo", dias_atras: 0 },
  { id: "g6", termo: "o que é renda fixa", fonte: "google", volume: 189_000, variacao_pct: 64, categoria: "finanças pessoais", dias_atras: 1 },
  { id: "g7", termo: "animais do fundo do mar", fonte: "google", volume: 97_000, variacao_pct: 121, categoria: "mar e vida marinha", dias_atras: 1 },
  { id: "g8", termo: "alongamento para dor nas costas", fonte: "google", volume: 152_000, variacao_pct: 29, categoria: "fitness", dias_atras: 1 },
  { id: "g9", termo: "massa de pizza sem forno", fonte: "google", volume: 211_000, variacao_pct: 17, categoria: "culinária", dias_atras: 1 },
  { id: "g10", termo: "como trocar óleo do carro", fonte: "google", volume: 143_000, variacao_pct: 8, categoria: "automotivo", dias_atras: 3 },
  { id: "g11", termo: "curiosidades sobre o espaço", fonte: "google", volume: 208_000, variacao_pct: 45, categoria: "curiosidades", dias_atras: 5 },
  { id: "g12", termo: "por que o céu é azul", fonte: "google", volume: 119_000, variacao_pct: 22, categoria: "curiosidades", dias_atras: 6 },
  { id: "g13", termo: "treino para quem trabalha sentado", fonte: "google", volume: 76_000, variacao_pct: 92, categoria: "fitness", dias_atras: 12 },
  { id: "g14", termo: "plantas que purificam o ar", fonte: "google", volume: 134_000, variacao_pct: -6, categoria: "natureza", dias_atras: 22 },
  { id: "g15", termo: "trilhas perto de são paulo", fonte: "google", volume: 91_000, variacao_pct: 33, categoria: "natureza", dias_atras: 26 },

  /* ------------------------------------------------------------ youtube */
  { id: "y1", termo: "receita 3 ingredientes", fonte: "youtube", volume: 892_000, variacao_pct: 27, categoria: "culinária", dias_atras: 0 },
  { id: "y2", termo: "fatos que parecem mentira", fonte: "youtube", volume: 1_240_000, variacao_pct: 54, categoria: "curiosidades", dias_atras: 0 },
  { id: "y3", termo: "abissal criatura desconhecida", fonte: "youtube", volume: 706_000, variacao_pct: 212, categoria: "mar e vida marinha", dias_atras: 0 },
  { id: "y4", termo: "investindo 100 reais por mês", fonte: "youtube", volume: 447_000, variacao_pct: 68, categoria: "finanças pessoais", dias_atras: 0 },
  { id: "y5", termo: "treino 5 minutos", fonte: "youtube", volume: 634_000, variacao_pct: 19, categoria: "fitness", dias_atras: 1 },
  { id: "y6", termo: "polvo mudando de cor", fonte: "youtube", volume: 421_000, variacao_pct: 187, categoria: "mar e vida marinha", dias_atras: 1 },
  { id: "y7", termo: "gambiarra automotiva que funciona", fonte: "youtube", volume: 389_000, variacao_pct: 44, categoria: "automotivo", dias_atras: 1 },
  { id: "y8", termo: "sobremesa 2 ingredientes", fonte: "youtube", volume: 528_000, variacao_pct: 31, categoria: "culinária", dias_atras: 1 },
  { id: "y9", termo: "investir do zero 2026", fonte: "youtube", volume: 318_000, variacao_pct: 73, categoria: "finanças pessoais", dias_atras: 4 },
  { id: "y10", termo: "o que tem no fundo da fossa", fonte: "youtube", volume: 612_000, variacao_pct: 96, categoria: "mar e vida marinha", dias_atras: 5 },
  { id: "y11", termo: "carro antigo restaurado", fonte: "youtube", volume: 267_000, variacao_pct: 31, categoria: "automotivo", dias_atras: 9 },
  { id: "y12", termo: "experimento que parece mágica", fonte: "youtube", volume: 741_000, variacao_pct: 58, categoria: "curiosidades", dias_atras: 14 },
  { id: "y13", termo: "sons da natureza para dormir", fonte: "youtube", volume: 549_000, variacao_pct: -11, categoria: "natureza", dias_atras: 19 },
  { id: "y14", termo: "experiência de química caseira", fonte: "youtube", volume: 383_000, variacao_pct: 42, categoria: "curiosidades", dias_atras: 27 },
  { id: "y15", termo: "amanhecer em time-lapse", fonte: "youtube", volume: 224_000, variacao_pct: 7, categoria: "natureza", dias_atras: 29 },

  /* ------------------------------------------------------------------ x */
  { id: "x1", termo: "IA substituindo emprego", fonte: "x", volume: 84_000, variacao_pct: 156, dias_atras: 0 },
  { id: "x2", termo: "preço da gasolina", fonte: "x", volume: 62_000, variacao_pct: 89, categoria: "automotivo", dias_atras: 0 },
  { id: "x3", termo: "criatura achada no oceano", fonte: "x", volume: 39_000, variacao_pct: 267, categoria: "mar e vida marinha", dias_atras: 0 },
  { id: "x4", termo: "receita viral do momento", fonte: "x", volume: 51_000, variacao_pct: 74, categoria: "culinária", dias_atras: 0 },
  { id: "x5", termo: "documentário sobre oceano", fonte: "x", volume: 31_000, variacao_pct: 204, categoria: "mar e vida marinha", dias_atras: 1 },
  { id: "x6", termo: "jejum intermitente funciona", fonte: "x", volume: 47_000, variacao_pct: 23, categoria: "fitness", dias_atras: 1 },
  { id: "x7", termo: "juros do cartão de crédito", fonte: "x", volume: 73_000, variacao_pct: 58, categoria: "finanças pessoais", dias_atras: 1 },
  { id: "x8", termo: "reforma tributária explicada", fonte: "x", volume: 118_000, variacao_pct: 67, categoria: "finanças pessoais", dias_atras: 6 },
  { id: "x9", termo: "fato histórico esquecido", fonte: "x", volume: 44_000, variacao_pct: 91, categoria: "curiosidades", dias_atras: 8 },
  { id: "x10", termo: "chef brasileiro premiado", fonte: "x", volume: 26_000, variacao_pct: -14, categoria: "culinária", dias_atras: 16 },
  { id: "x11", termo: "recall de veículo popular", fonte: "x", volume: 58_000, variacao_pct: 112, categoria: "automotivo", dias_atras: 18 },
  { id: "x12", termo: "queimadas na amazônia", fonte: "x", volume: 203_000, variacao_pct: 38, categoria: "natureza", dias_atras: 25 },

  /* ----------------------------------------------------------- hashtags */
  { id: "h1", termo: "#receitafacil", fonte: "hashtag", volume: 2_400_000, variacao_pct: 18, categoria: "culinária", dias_atras: 0 },
  { id: "h2", termo: "#treinoemcasa", fonte: "hashtag", volume: 1_870_000, variacao_pct: 34, categoria: "fitness", dias_atras: 0 },
  { id: "h3", termo: "#fundodomar", fonte: "hashtag", volume: 830_000, variacao_pct: 189, categoria: "mar e vida marinha", dias_atras: 0 },
  { id: "h4", termo: "#dinheironobolso", fonte: "hashtag", volume: 1_120_000, variacao_pct: 71, categoria: "finanças pessoais", dias_atras: 0 },
  { id: "h5", termo: "#vocesabia", fonte: "hashtag", volume: 3_120_000, variacao_pct: 61, categoria: "curiosidades", dias_atras: 1 },
  { id: "h6", termo: "#vidamarinha", fonte: "hashtag", volume: 640_000, variacao_pct: 143, categoria: "mar e vida marinha", dias_atras: 1 },
  { id: "h7", termo: "#garagem", fonte: "hashtag", volume: 540_000, variacao_pct: 26, categoria: "automotivo", dias_atras: 1 },
  { id: "h8", termo: "#semglúten", fonte: "hashtag", volume: 690_000, variacao_pct: 39, categoria: "culinária", dias_atras: 1 },
  { id: "h9", termo: "#dicasdedinheiro", fonte: "hashtag", volume: 980_000, variacao_pct: 52, categoria: "finanças pessoais", dias_atras: 3 },
  { id: "h10", termo: "#fatosincriveis", fonte: "hashtag", volume: 1_640_000, variacao_pct: 44, categoria: "curiosidades", dias_atras: 7 },
  { id: "h11", termo: "#carrosantigos", fonte: "hashtag", volume: 720_000, variacao_pct: 9, categoria: "automotivo", dias_atras: 11 },
  { id: "h12", termo: "#treinopesado", fonte: "hashtag", volume: 1_310_000, variacao_pct: 21, categoria: "fitness", dias_atras: 15 },
  { id: "h13", termo: "#naturezaviva", fonte: "hashtag", volume: 1_150_000, variacao_pct: -3, categoria: "natureza", dias_atras: 21 },
  { id: "h14", termo: "#airfryer", fonte: "hashtag", volume: 4_060_000, variacao_pct: 26, categoria: "culinária", dias_atras: 29 },
  { id: "h15", termo: "#trilha", fonte: "hashtag", volume: 470_000, variacao_pct: 15, categoria: "natureza", dias_atras: 30 },
];
