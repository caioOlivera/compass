import type { Itinerary } from "@/lib/validation/itinerary";
import { toPromptInput, TripRequestInputSchema } from "@/lib/validation/trip-request";

// Exemplo do PRD: Rio de Janeiro → Itália, 15 dias, auge nas Dolomitas, evitando Veneza.
export const pedidoPRD = toPromptInput(
  TripRequestInputSchema.parse({
    continente_regiao: "europa-do-sul",
    data_inicio: "2026-09-10",
    data_fim: "2026-09-25",
    ritmo_viagem: "medio",
    auge_da_viagem: "Dolomitas",
    locais_desejados_complementares: ["Roma", "Milão"],
    locais_a_evitar: ["Veneza"],
    cidade_origem: "Rio de Janeiro",
    aceita_outros_aeroportos: true,
    observacoes: "Quero alugar carro para fazer as Dolomitas. Prefiro pegar o carro na saída de Roma.",
  }),
);

export function roteiroPRD(): Itinerary {
  return {
    titulo: "Itália de Roma às Dolomitas",
    resumo_estrategico: {
      total_dias_viagem: 15,
      ritmo_aplicado: "Médio (com nuances por tipo de destino)",
      logistica_voos: "Entrada por Roma (FCO) | Saída por Milão (MXP)",
      estrategia_deslocamento: "Trem de Roma a Florença + carro alugado de Florença até Milão pelas Dolomitas.",
      justificativa_fluidez: "Linha contínua de sul para norte, sem bate-e-volta.",
      alertas: ["Devolver o carro em outra cidade costuma ter taxa extra."],
    },
    pontos_mapa: [
      {
        id_ponto: "p1",
        ordem: 1,
        nome_local: "Roma",
        tipo_ponto: "hub_entrada",
        coordenadas: { lat: 41.9028, lng: 12.4964 },
        dias_alocados: 3,
        subtitulo_card: "Porta de entrada e história antiga",
        atribuicoes_e_checklist: [
          { item: "Coliseu e Fórum Romano", categoria: "Imperdível" },
          { item: "Vaticano", categoria: "Cultura" },
          { item: "Jantar em Trastevere", categoria: "Gastronomia" },
        ],
        proximo_deslocamento: {
          destino_id: "p2",
          meio_transporte: "Trem Frecciarossa",
          tempo_estimado: "1h 35min",
          instrucoes_logistica: "Roma Termini → Firenze S.M.N.",
        },
      },
      {
        id_ponto: "p2",
        ordem: 2,
        nome_local: "Florença",
        tipo_ponto: "base_intermediaria",
        coordenadas: { lat: 43.7696, lng: 11.2558 },
        dias_alocados: 2,
        subtitulo_card: "Conexão lógica e pitstop cultural",
        atribuicoes_e_checklist: [{ item: "Galeria Uffizi", categoria: "Cultura" }],
        proximo_deslocamento: {
          destino_id: "p3",
          meio_transporte: "Carro alugado",
          tempo_estimado: "3h 45min",
          instrucoes_logistica: "Retire o carro em Florença e suba pela A22.",
        },
      },
      {
        id_ponto: "p3",
        ordem: 3,
        nome_local: "Dolomitas (base Cortina d'Ampezzo)",
        tipo_ponto: "auge_viagem",
        coordenadas: { lat: 46.5369, lng: 12.1357 },
        dias_alocados: 8,
        subtitulo_card: "O auge da viagem",
        atribuicoes_e_checklist: [
          { item: "Tre Cime di Lavaredo", categoria: "Aventura" },
          { item: "Lago di Braies cedo", categoria: "Imperdível" },
        ],
        proximo_deslocamento: {
          destino_id: "p4",
          meio_transporte: "Carro alugado",
          tempo_estimado: "3h 10min",
          instrucoes_logistica: "Desça para Milão e devolva o carro em Malpensa.",
        },
      },
      {
        id_ponto: "p4",
        ordem: 4,
        nome_local: "Milão",
        tipo_ponto: "hub_saida",
        coordenadas: { lat: 45.4642, lng: 9.19 },
        dias_alocados: 2,
        subtitulo_card: "Porta de saída",
        atribuicoes_e_checklist: [{ item: "Duomo e terraços", categoria: "Imperdível" }],
        proximo_deslocamento: null,
      },
    ],
  };
}
