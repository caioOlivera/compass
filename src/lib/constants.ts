// Opções fixas do wizard. A IA nunca pode sair das regiões escolhidas (até 4, para roteiros que
// cruzam regiões, como Qatar + Tailândia + Coreia).
export const SUBREGIOES = [
  { id: "america-do-norte", continente: "América", nome: "América do Norte" },
  { id: "america-central", continente: "América", nome: "América Central" },
  { id: "america-do-sul", continente: "América", nome: "América do Sul" },
  // Europa inteira numa opção só: as distâncias são curtas e uma rota natural cruza sub-regiões.
  { id: "europa", continente: "Europa", nome: "Europa" },
  { id: "asia-leste", continente: "Ásia", nome: "Ásia Leste" },
  { id: "asia-sul", continente: "Ásia", nome: "Sul da Ásia" },
  { id: "oriente-medio", continente: "Ásia", nome: "Oriente Médio" },
  { id: "sudeste-asiatico", continente: "Ásia", nome: "Sudeste Asiático" },
  { id: "africa-do-norte", continente: "África", nome: "África do Norte" },
  { id: "africa-subsaariana", continente: "África", nome: "África Subsaariana" },
  { id: "oceania", continente: "Oceania", nome: "Oceania" },
] as const;

export const RITMOS = [
  { id: "lento", nome: "Lento", descricao: "Mais tempo em cada base, poucas trocas de hotel." },
  { id: "medio", nome: "Médio", descricao: "Equilíbrio entre ver bastante e descansar." },
  { id: "acelerado", nome: "Acelerado", descricao: "Muitas paradas, o mínimo de dias em cada uma." },
] as const;

export const TIPOS_PONTO = ["hub_entrada", "base_intermediaria", "auge_viagem", "hub_saida"] as const;

// Mesma lista do system prompt (src/lib/ai/prompts/itinerary-system.ts)
export const CATEGORIAS_CHECKLIST = [
  "Imperdível",
  "Cultura",
  "Gastronomia",
  "Natureza",
  "Cênico",
  "Aventura",
  "Compras",
  "Caminhada",
  "Vida noturna",
  "Logística",
] as const;

export const REGIOES_MAX = 4;

export const ORCAMENTOS = [
  { id: "economico", nome: "Econômico", descricao: "Hostels e pousadas simples, transporte público, comida local." },
  { id: "medio", nome: "Médio", descricao: "Hotéis 3 estrelas bem localizados, alguns passeios guiados." },
  { id: "conforto", nome: "Conforto", descricao: "Hotéis 4 estrelas, trens rápidos, restaurantes escolhidos." },
  { id: "luxo", nome: "Luxo", descricao: "Hotéis 5 estrelas, transfers privados, experiências exclusivas." },
] as const;

export const INTERESSES = [
  "Cultura e história",
  "Natureza e trilhas",
  "Praias",
  "Gastronomia",
  "Vida noturna",
  "Compras",
  "Aventura",
  "Fotografia",
  "Museus",
  "Vinhos",
  "Bem-estar",
  "Festivais e eventos",
] as const;

export const FLEXIBILIDADE_MAX_DIAS = 5;
export const VIAGEM_MAX_DIAS = 90;
export const LOCAIS_MAX = 15;

export type SubregiaoId = (typeof SUBREGIOES)[number]["id"];
export type RitmoId = (typeof RITMOS)[number]["id"];
export type OrcamentoId = (typeof ORCAMENTOS)[number]["id"];
export type TipoPonto = (typeof TIPOS_PONTO)[number];
export type CategoriaChecklist = (typeof CATEGORIAS_CHECKLIST)[number];

export const SUBREGIAO_IDS = SUBREGIOES.map((s) => s.id) as [SubregiaoId, ...SubregiaoId[]];
/** Ids de versões antigas do questionário (rascunhos salvos no navegador) → id atual. */
export const SUBREGIOES_ANTIGAS: Record<string, SubregiaoId> = {
  "europa-do-norte": "europa",
  "europa-do-sul": "europa",
  "europa-central-leste": "europa",
};

export const RITMO_IDS = RITMOS.map((r) => r.id) as [RitmoId, ...RitmoId[]];
export const ORCAMENTO_IDS = ORCAMENTOS.map((o) => o.id) as [OrcamentoId, ...OrcamentoId[]];
