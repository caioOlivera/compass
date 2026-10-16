// Roteiro de exemplo do PRD. Usado nos testes e na página /exemplo (demonstração sem login nem IA).
import type { Itinerary } from "@/lib/validation/itinerary";
import { toPromptInput, TripRequestInputSchema } from "@/lib/validation/trip-request";

// Exemplo do PRD: Rio de Janeiro → Itália, 15 dias, auge nas Dolomitas, evitando Veneza.
export const pedidoPRD = toPromptInput(
  TripRequestInputSchema.parse({
    regioes: ["europa"],
    data_inicio: "2026-09-10",
    data_fim: "2026-09-25",
    ritmo_viagem: "medio",
    auge_da_viagem: "Dolomitas",
    locais_desejados_complementares: ["Roma", "Milão"],
    locais_a_evitar: ["Veneza"],
    cidade_origem: "São Paulo",
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
      aeroportos: { origem: "SAO", entrada: "FCO", saida: "MXP" },
    },
    referencias_base: [],
    pontos_mapa: [
      {
        id_ponto: "p1",
        ordem: 1,
        nome_local: "Roma",
        emoji: "🏛️",
        tipo_ponto: "hub_entrada",
        coordenadas: { lat: 41.9028, lng: 12.4964 },
        dias_alocados: 3,
        subtitulo_card: "Porta de entrada e história antiga",
        atribuicoes_e_checklist: [
          { item: "Coliseu e Fórum Romano", categoria: "Imperdível" },
          { item: "Vaticano", categoria: "Cultura" },
          { item: "Jantar em Trastevere", categoria: "Gastronomia" },
        ],
        plano_dias: [
          { dia: 1, titulo: "Chegada e Trastevere", descricao: "Chegada em Fiumicino e trem Leonardo Express até Termini. À tarde, caminhada leve pelo centro; jantar em Trastevere." },
          { dia: 2, titulo: "Coliseu e Fórum Romano", descricao: "Manhã no Coliseu com ingresso de horário marcado, depois Fórum e Palatino. Fim de tarde na Fontana di Trevi e no Panteão." },
          { dia: 3, titulo: "Vaticano", descricao: "Museus do Vaticano e Capela Sistina logo cedo; Basílica de São Pedro em seguida. Noite livre no Campo de' Fiori." },
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
        emoji: "🎨",
        tipo_ponto: "base_intermediaria",
        coordenadas: { lat: 43.7696, lng: 11.2558 },
        dias_alocados: 2,
        subtitulo_card: "Conexão lógica e pitstop cultural",
        atribuicoes_e_checklist: [{ item: "Galeria Uffizi", categoria: "Cultura" }],
        plano_dias: [
          { dia: 4, titulo: "Trem para Florença e Duomo", descricao: "Frecciarossa pela manhã. À tarde, Duomo e Ponte Vecchio; pôr do sol na Piazzale Michelangelo." },
          { dia: 5, titulo: "Uffizi e retirada do carro", descricao: "Galeria Uffizi com reserva. No fim do dia, retire o carro fora da ZTL para sair cedo no dia seguinte." },
        ],
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
        emoji: "🏔️",
        tipo_ponto: "auge_viagem",
        coordenadas: { lat: 46.5369, lng: 12.1357 },
        dias_alocados: 8,
        subtitulo_card: "O auge da viagem",
        atribuicoes_e_checklist: [
          { item: "Tre Cime di Lavaredo", categoria: "Aventura" },
          { item: "Lago di Braies cedo", categoria: "Imperdível" },
        ],
        plano_dias: [
          { dia: 6, titulo: "Estrada até Cortina", descricao: "Saída cedo pela A22, parada para almoço em Bolzano e chegada a Cortina no fim da tarde." },
          { dia: 7, titulo: "Lago di Braies", descricao: "Lago di Braies ao amanhecer, antes das vans de excursão. À tarde, volta pelo Lago di Dobbiaco." },
          { dia: 8, titulo: "Tre Cime di Lavaredo", descricao: "Estrada com pedágio até o Rifugio Auronzo e a volta completa nas Tre Cime (cerca de 4 h de trilha)." },
          { dia: 9, titulo: "Cinque Torri", descricao: "Teleférico para as Cinque Torri e trilha entre as trincheiras da Primeira Guerra." },
          { dia: 10, titulo: "Dia livre em Cortina", descricao: "Descanso, cafés no Corso Italia ou um dia extra caso o tempo tenha atrapalhado uma trilha." },
          { dia: 11, titulo: "Passo Giau e Lago di Sorapis", descricao: "Mirante do Passo Giau cedo; trilha até o Lago di Sorapis (ida e volta de 4 a 5 h)." },
          { dia: 12, titulo: "Val Gardena e Seceda", descricao: "Estrada pelos passos até Ortisei e teleférico para Seceda, o cartão-postal das Dolomitas." },
          { dia: 13, titulo: "Alpe di Siusi", descricao: "Planalto da Alpe di Siusi de teleférico; caminhadas leves e pôr do sol com vista para o Sassolungo." },
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
        emoji: "⛪",
        tipo_ponto: "hub_saida",
        coordenadas: { lat: 45.4642, lng: 9.19 },
        dias_alocados: 2,
        subtitulo_card: "Porta de saída",
        atribuicoes_e_checklist: [{ item: "Duomo e terraços", categoria: "Imperdível" }],
        plano_dias: [
          { dia: 14, titulo: "Descida para Milão", descricao: "Estrada até Milão pela manhã e devolução do carro. À tarde, Duomo e terraços." },
          { dia: 15, titulo: "Último dia e voo", descricao: "Galleria Vittorio Emanuele e Navigli de manhã; transfer para Malpensa e voo de volta." },
        ],
        proximo_deslocamento: null,
      },
    ],
  };
}
