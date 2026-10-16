import type { SubregiaoId } from "@/lib/constants";

// Conteúdo visual da landing. `busca` é a consulta em inglês para o banco de fotos (rende fotos melhores);
// `cor` é o fundo do cartão quando não há foto.

export type Regiao = { id: SubregiaoId; nome: string; destaques: string; busca: string; emoji: string; cor: string };

export const REGIOES_LANDING: Regiao[] = [
  { id: "europa", nome: "Europa", destaques: "Dolomitas, Ilhas Gregas, Toscana", busca: "Amalfi coast Italy", emoji: "🏰", cor: "#3b5f7a" },
  { id: "america-do-sul", nome: "América do Sul", destaques: "Patagônia, Atacama, Machu Picchu", busca: "Torres del Paine Patagonia", emoji: "🏔️", cor: "#5b6f4a" },
  { id: "america-do-norte", nome: "América do Norte", destaques: "Nova York, Califórnia, Rochosas", busca: "Grand Canyon sunset", emoji: "🗽", cor: "#8a5a3c" },
  { id: "asia-leste", nome: "Ásia Leste", destaques: "Tóquio, Kyoto, Seul", busca: "Kyoto temple autumn", emoji: "⛩️", cor: "#7a3b3b" },
  { id: "sudeste-asiatico", nome: "Sudeste Asiático", destaques: "Bali, Ha Long, Angkor", busca: "Bali rice terraces", emoji: "🌺", cor: "#3f6b4f" },
  { id: "oriente-medio", nome: "Oriente Médio", destaques: "Capadócia, Petra, Dubai", busca: "Cappadocia hot air balloons", emoji: "🎈", cor: "#9a6a3a" },
  { id: "asia-sul", nome: "Sul da Ásia", destaques: "Rajastão, Nepal, Maldivas", busca: "Taj Mahal", emoji: "🕌", cor: "#a0703f" },
  { id: "africa-subsaariana", nome: "África Subsaariana", destaques: "Serengeti, Cidade do Cabo, Zanzibar", busca: "Serengeti safari", emoji: "🦁", cor: "#8a6a2f" },
  { id: "africa-do-norte", nome: "África do Norte", destaques: "Marrakech, Saara, Egito", busca: "Sahara desert Morocco", emoji: "🐫", cor: "#b07a45" },
  { id: "america-central", nome: "América Central e Caribe", destaques: "Costa Rica, Cuba, Punta Cana", busca: "Costa Rica rainforest", emoji: "🌋", cor: "#2f6b5a" },
  { id: "oceania", nome: "Oceania", destaques: "Nova Zelândia, Sydney, Bora Bora", busca: "Milford Sound New Zealand", emoji: "🦘", cor: "#2f5a7a" },
];

export type DestinoLanding = {
  nome: string;
  emoji: string;
  regiao: SubregiaoId;
  regiaoNome: string;
  ideia: string;
  busca: string;
};

export const DESTINOS_LANDING: DestinoLanding[] = [
  { nome: "Dolomitas", emoji: "🏔️", regiao: "europa", regiaoNome: "Itália", ideia: "Entra por Roma, sai por Milão", busca: "Dolomites Seceda" },
  { nome: "Ilhas Gregas", emoji: "🏝️", regiao: "europa", regiaoNome: "Grécia", ideia: "Atenas, ilhas de ferry, volta por Santorini", busca: "Santorini Oia" },
  { nome: "Patagônia", emoji: "🏔️", regiao: "america-do-sul", regiaoNome: "Argentina e Chile", ideia: "El Calafate a Torres del Paine por terra", busca: "Patagonia mountains lake" },
  { nome: "Tóquio", emoji: "🗼", regiao: "asia-leste", regiaoNome: "Japão", ideia: "Tóquio, Kyoto e saída por Osaka", busca: "Tokyo street night" },
  { nome: "Machu Picchu", emoji: "🦙", regiao: "america-do-sul", regiaoNome: "Peru", ideia: "Lima, Cusco e Vale Sagrado", busca: "Machu Picchu" },
  { nome: "Bali", emoji: "🌺", regiao: "sudeste-asiatico", regiaoNome: "Indonésia", ideia: "Ubud, praias do sul e ilhas Gili", busca: "Bali temple" },
  { nome: "Capadócia", emoji: "🎈", regiao: "oriente-medio", regiaoNome: "Turquia", ideia: "Istambul, Capadócia e a costa turquesa", busca: "Cappadocia balloons sunrise" },
  { nome: "Islândia", emoji: "🌌", regiao: "europa", regiaoNome: "Islândia", ideia: "A volta da ilha pela Ring Road", busca: "Iceland waterfall" },
  { nome: "Nova York", emoji: "🗽", regiao: "america-do-norte", regiaoNome: "Estados Unidos", ideia: "Nova York, Washington e Boston de trem", busca: "New York skyline" },
  { nome: "Cidade do Cabo", emoji: "🍷", regiao: "africa-subsaariana", regiaoNome: "África do Sul", ideia: "Cabo, vinícolas e a Garden Route", busca: "Cape Town Table Mountain" },
];

/** Mosaico do primeiro ecrã: três fotos grandes. */
export const MOSAICO_HERO = [
  { nome: "Dolomitas", emoji: "🏔️", busca: "Dolomites mountains lake" },
  { nome: "Santorini", emoji: "🏝️", busca: "Santorini blue domes" },
  { nome: "Kyoto", emoji: "⛩️", busca: "Kyoto Fushimi Inari" },
] as const;

/** Link para o questionário já com a região e/ou o auge preenchidos. */
export function linkQuestionario(auge?: string, regiao?: string) {
  const p = new URLSearchParams();
  if (regiao) p.set("regiao", regiao);
  if (auge) p.set("auge", auge);
  const qs = p.toString();
  return `/nova-viagem${qs ? `?${qs}` : ""}`;
}
