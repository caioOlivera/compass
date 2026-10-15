// Conteúdo da landing: o roteiro de exemplo (São Paulo → Itália → São Paulo) contado parada a parada.
// Os números batem com o roteiro real de /exemplo: 15 dias, ritmo médio, 3 + 2 + 8 + 2.

export type ParadaLanding = {
  id: string;
  nome: string;
  papel: string;
  dias: number;
  lat: number;
  lng: number;
  /** Como se chega à próxima parada */
  trecho?: { meio: string; tempo: string };
};

export const ROTA: ParadaLanding[] = [
  { id: "roma", nome: "Roma", papel: "Porta de entrada", dias: 3, lat: 41.9, lng: 12.5, trecho: { meio: "Trem Frecciarossa", tempo: "1h 35min" } },
  { id: "florenca", nome: "Florença", papel: "Base no caminho", dias: 2, lat: 43.77, lng: 11.26, trecho: { meio: "Carro alugado", tempo: "3h 45min" } },
  { id: "dolomitas", nome: "Dolomitas", papel: "Auge da viagem", dias: 8, lat: 46.54, lng: 12.14, trecho: { meio: "Carro alugado", tempo: "3h 10min" } },
  { id: "milao", nome: "Milão", papel: "Porta de saída", dias: 2, lat: 45.46, lng: 9.19 },
];

export const VOO_IDA = { de: "GRU", para: "FCO", cidadeDe: "São Paulo", cidadePara: "Roma" };
export const VOO_VOLTA = { de: "MXP", para: "GRU", cidadeDe: "Milão", cidadePara: "São Paulo" };

// A coisa viva: o mesmo pedido (15 dias, auge nas Dolomitas) em três ritmos.
// Lento corta bases para dar dias à montanha; acelerado encaixa mais paradas no caminho.
export const RITMOS_EXEMPLO = {
  lento: {
    rotulo: "Lento",
    resumo: "Menos trocas de hotel. Florença sai e a montanha ganha os dias.",
    paradas: [
      { nome: "Roma", dias: 4 },
      { nome: "Dolomitas", dias: 9, auge: true },
      { nome: "Milão", dias: 2 },
    ],
  },
  medio: {
    rotulo: "Médio",
    resumo: "Três dias por cidade, oito na região do auge.",
    paradas: [
      { nome: "Roma", dias: 3 },
      { nome: "Florença", dias: 2 },
      { nome: "Dolomitas", dias: 8, auge: true },
      { nome: "Milão", dias: 2 },
    ],
  },
  acelerado: {
    rotulo: "Acelerado",
    resumo: "Duas noites por cidade e mais paradas, todas no caminho para o norte.",
    paradas: [
      { nome: "Roma", dias: 2 },
      { nome: "Florença", dias: 2 },
      { nome: "Verona", dias: 2 },
      { nome: "Dolomitas", dias: 5, auge: true },
      { nome: "Lago di Como", dias: 2 },
      { nome: "Milão", dias: 2 },
    ],
  },
} as const;

export type RitmoExemplo = keyof typeof RITMOS_EXEMPLO;

/** Projeção simples (equirretangular) das coordenadas no quadro do desenho da rota. */
export function projetar(lat: number, lng: number, largura: number, altura: number) {
  const [lngMin, lngMax, latMin, latMax] = [8.4, 13.3, 41.3, 47.1];
  return {
    x: ((lng - lngMin) / (lngMax - lngMin)) * largura,
    y: ((latMax - lat) / (latMax - latMin)) * altura,
  };
}
