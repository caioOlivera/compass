import type { SubregiaoId } from "@/lib/constants";

// Sugestões para a etapa "auge da viagem", conforme a região escolhida na primeira etapa.
// Todas ficam dentro da caixa da sub-região (lib/geo/subregions.ts), para não induzir um roteiro inválido.

export type SugestaoAuge = { nome: string; emoji: string };

export const SUGESTOES_AUGE: Record<SubregiaoId, SugestaoAuge[]> = {
  "america-do-norte": [
    { nome: "Nova York", emoji: "🗽" },
    { nome: "Costa da Califórnia", emoji: "🌉" },
    { nome: "Parques do Oeste americano", emoji: "🏜️" },
    { nome: "Montanhas Rochosas canadenses", emoji: "🏔️" },
    { nome: "Orlando", emoji: "🎢" },
    { nome: "Cancún e Riviera Maya", emoji: "🏝️" },
  ],
  "america-central": [
    { nome: "Costa Rica", emoji: "🌋" },
    { nome: "Guatemala e Tikal", emoji: "🛕" },
    { nome: "San Blas, Panamá", emoji: "🏝️" },
    { nome: "Belize", emoji: "🐠" },
    { nome: "Cuba", emoji: "🎺" },
    { nome: "Punta Cana", emoji: "🏖️" },
  ],
  "america-do-sul": [
    { nome: "Patagônia", emoji: "🏔️" },
    { nome: "Deserto do Atacama", emoji: "🏜️" },
    { nome: "Machu Picchu", emoji: "🦙" },
    { nome: "Salar de Uyuni", emoji: "🧂" },
    { nome: "Mendoza", emoji: "🍷" },
    { nome: "Galápagos", emoji: "🐢" },
  ],
  europa: [
    { nome: "Dolomitas", emoji: "🏔️" },
    { nome: "Ilhas Gregas", emoji: "🏝️" },
    { nome: "Toscana", emoji: "🍷" },
    { nome: "Costa Amalfitana", emoji: "🌊" },
    { nome: "Islândia", emoji: "🌌" },
    { nome: "Fiordes da Noruega", emoji: "⛰️" },
    { nome: "Provença", emoji: "💜" },
  ],
  "asia-leste": [
    { nome: "Tóquio", emoji: "🗼" },
    { nome: "Kyoto", emoji: "⛩️" },
    { nome: "Monte Fuji", emoji: "🗻" },
    { nome: "Seul", emoji: "🏯" },
    { nome: "Pequim e a Muralha", emoji: "🧱" },
    { nome: "Hong Kong", emoji: "🌃" },
  ],
  "asia-sul": [
    { nome: "Rajastão", emoji: "🕌" },
    { nome: "Himalaia no Nepal", emoji: "🏔️" },
    { nome: "Maldivas", emoji: "🏝️" },
    { nome: "Sri Lanka", emoji: "🐘" },
    { nome: "Kerala", emoji: "🌴" },
    { nome: "Butão", emoji: "🐉" },
  ],
  "oriente-medio": [
    { nome: "Dubai", emoji: "🏙️" },
    { nome: "Petra e Wadi Rum", emoji: "🏜️" },
    { nome: "Capadócia", emoji: "🎈" },
    { nome: "Istambul", emoji: "🕌" },
    { nome: "Omã", emoji: "⛰️" },
    { nome: "Abu Dhabi", emoji: "🕋" },
  ],
  "sudeste-asiatico": [
    { nome: "Bali", emoji: "🌺" },
    { nome: "Baía de Ha Long", emoji: "🛶" },
    { nome: "Angkor Wat", emoji: "🛕" },
    { nome: "Phuket e Krabi", emoji: "🏖️" },
    { nome: "Palawan", emoji: "🏝️" },
    { nome: "Chiang Mai", emoji: "🐘" },
  ],
  "africa-do-norte": [
    { nome: "Marrakech", emoji: "🕌" },
    { nome: "Deserto do Saara", emoji: "🐫" },
    { nome: "Pirâmides de Gizé", emoji: "🔺" },
    { nome: "Cruzeiro pelo Nilo", emoji: "⛵" },
    { nome: "Chefchaouen", emoji: "💙" },
    { nome: "Tunísia", emoji: "🏛️" },
  ],
  "africa-subsaariana": [
    { nome: "Serengeti", emoji: "🦁" },
    { nome: "Cidade do Cabo", emoji: "🍷" },
    { nome: "Parque Kruger", emoji: "🦒" },
    { nome: "Zanzibar", emoji: "🏝️" },
    { nome: "Cataratas Vitória", emoji: "💦" },
    { nome: "Ilhas Maurício", emoji: "🐠" },
  ],
  oceania: [
    { nome: "Sydney", emoji: "🦘" },
    { nome: "Grande Barreira de Corais", emoji: "🐠" },
    { nome: "Queenstown", emoji: "🏔️" },
    { nome: "Milford Sound", emoji: "🗻" },
    { nome: "Bora Bora", emoji: "🏝️" },
    { nome: "Fiji", emoji: "🌴" },
  ],
};

/** Sem região escolhida (rascunho antigo): uma mistura de continentes. */
export const SUGESTOES_GERAIS: SugestaoAuge[] = [
  { nome: "Dolomitas", emoji: "🏔️" },
  { nome: "Patagônia", emoji: "🏔️" },
  { nome: "Tóquio", emoji: "🗼" },
  { nome: "Ilhas Gregas", emoji: "🏝️" },
  { nome: "Nova York", emoji: "🗽" },
  { nome: "Bali", emoji: "🌺" },
];
