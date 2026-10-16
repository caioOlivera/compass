import { z } from "zod";
import { CATEGORIAS_CHECKLIST, TIPOS_PONTO } from "@/lib/constants";

// Saída do motor de roteiros. Vai para o Claude como structured output (zodOutputFormat):
// o SDK tira do JSON Schema o que a API não aceita (min/max) e valida isso no retorno.
// Os .describe() viram "description" no schema e orientam o modelo campo a campo.

export const CoordenadasSchema = z.object({
  lat: z.number().min(-90).max(90).describe("Latitude em graus decimais"),
  lng: z.number().min(-180).max(180).describe("Longitude em graus decimais"),
});

export const ItemChecklistSchema = z.object({
  item: z.string().min(2).max(140).describe("Atração ou experiência, curta e específica"),
  categoria: z.enum(CATEGORIAS_CHECKLIST),
});

export const DeslocamentoSchema = z.object({
  destino_id: z.string().describe("id_ponto do próximo ponto da rota"),
  meio_transporte: z.string().min(2).max(60).describe('Ex.: "Trem Frecciarossa", "Carro alugado", "Ferry"'),
  tempo_estimado: z.string().min(2).max(30).describe('Tempo médio porta a porta, ex.: "1h 35min"'),
  instrucoes_logistica: z.string().min(2).max(400),
});

export const DiaPlanoSchema = z.object({
  dia: z.int().min(1).max(120).describe("Número do dia na viagem inteira (dia 1 = primeiro dia), contínuo entre as paradas"),
  titulo: z.string().min(2).max(80).describe('Ex.: "Coliseu e Fórum Romano"'),
  descricao: z.string().min(5).max(400).describe("Manhã, tarde e noite em 1 a 3 frases, práticas"),
});

export const RestauranteSchema = z.object({
  nome: z.string().min(2).max(80),
  tipo: z.string().min(2).max(60).describe('Ex.: "Trattoria", "Street food", "Bistrô"'),
  faixa: z.enum(["$", "$$", "$$$"]).describe("$ barato, $$ médio, $$$ caro"),
  dica: z.string().min(2).max(160).describe("O que pedir ou por que ir, numa frase"),
});

export const PontoMapaSchema = z.object({
  id_ponto: z.string().regex(/^p\d+$/).describe('"p1", "p2", ... na ordem da rota'),
  ordem: z.int().min(1),
  nome_local: z.string().min(2).max(120),
  // Roteiros gravados antes deste campo não têm emoji: o default mantém a leitura funcionando.
  emoji: z
    .string()
    .min(1)
    .max(16)
    .describe("Um emoji que represente o lugar, ex.: 🏛️ para Roma, 🏔️ para as Dolomitas, 🏖️ para uma praia")
    .default("📍"),
  tipo_ponto: z.enum(TIPOS_PONTO),
  coordenadas: CoordenadasSchema,
  dias_alocados: z.int().min(1).max(90),
  subtitulo_card: z.string().min(2).max(80),
  atribuicoes_e_checklist: z.array(ItemChecklistSchema).min(1).max(12),
  proximo_deslocamento: DeslocamentoSchema.nullable().describe("null apenas no último ponto"),
  plano_dias: z
    .array(DiaPlanoSchema)
    .max(90)
    .describe("Uma entrada por dia alocado nesta parada, em ordem")
    .default([]),
  restaurantes: z
    .array(RestauranteSchema)
    .max(4)
    .describe("2 ou 3 restaurantes reais quando fizer sentido; lista vazia na dúvida")
    .default([]),
});

export const ResumoEstrategicoSchema = z.object({
  total_dias_viagem: z.int().min(1),
  ritmo_aplicado: z.string().max(120),
  logistica_voos: z.string().max(300).describe('Ex.: "Entrada por Roma (FCO) | Saída por Milão (MXP)"'),
  estrategia_deslocamento: z.string().max(400),
  justificativa_fluidez: z.string().max(600),
  alertas: z
    .array(z.string().max(300))
    .describe("O que não foi possível cumprir ou merece atenção. Lista vazia se nada."),
  // Roteiros antigos não têm: o default mantém a leitura e a cotação cai no texto de logistica_voos
  aeroportos: z
    .object({
      origem: z.string().regex(/^[A-Z]{3}$/).describe('Código IATA de cidade ou aeroporto de embarque no Brasil, ex.: "SAO", "GYN"'),
      entrada: z.string().regex(/^[A-Z]{3}$/).describe('IATA do aeroporto de chegada no destino, ex.: "FCO"'),
      saida: z.string().regex(/^[A-Z]{3}$/).describe('IATA do aeroporto de onde volta para o Brasil, ex.: "MXP"'),
    })
    .nullable()
    .describe("Aeroportos do voo internacional (open-jaw): embarque, chegada e volta")
    .default(null),
});

export const ItinerarySchema = z.object({
  titulo: z.string().min(2).max(80).describe('Nome curto da viagem, ex.: "Itália de Roma às Dolomitas"'),
  resumo_estrategico: ResumoEstrategicoSchema,
  pontos_mapa: z.array(PontoMapaSchema).min(1).max(20),
  referencias_base: z
    .array(z.string().regex(/^R\d{1,3}$/))
    .max(80)
    .describe('Ids da base de conhecimento usados no roteiro, ex.: ["R3", "R12"]. Lista vazia se nenhum.')
    .default([]),
});

export type Coordenadas = z.infer<typeof CoordenadasSchema>;
export type ItemChecklist = z.infer<typeof ItemChecklistSchema>;
export type Deslocamento = z.infer<typeof DeslocamentoSchema>;
export type PontoMapa = z.infer<typeof PontoMapaSchema>;
export type DiaPlano = z.infer<typeof DiaPlanoSchema>;
export type Restaurante = z.infer<typeof RestauranteSchema>;
export type ResumoEstrategico = z.infer<typeof ResumoEstrategicoSchema>;
export type Itinerary = z.infer<typeof ItinerarySchema>;

// ---------------------------------------------------------------------------
// Checklist marcado pelo usuário (generated_itineraries.checklist_state)
// ---------------------------------------------------------------------------

/** { "p1": [0, 2] } = itens 0 e 2 do checklist de p1 marcados. */
export const ChecklistStateSchema = z.record(
  z.string().regex(/^p\d+$/),
  z.array(z.int().min(0).max(11)).max(12),
);

export type ChecklistState = z.infer<typeof ChecklistStateSchema>;
