import { z } from "zod";
import {
  FLEXIBILIDADE_MAX_DIAS,
  INTERESSES,
  LOCAIS_MAX,
  ORCAMENTO_IDS,
  REGIOES_MAX,
  RITMO_IDS,
  SUBREGIAO_IDS,
  SUBREGIOES_ANTIGAS,
  VIAGEM_MAX_DIAS,
  type SubregiaoId,
} from "@/lib/constants";
import type { TablesInsert } from "@/types/database";

// Respostas do wizard. As chaves seguem o PRD porque este mesmo objeto vai para a IA.
// Um schema só valida o formulário no cliente e o body de POST /api/generate-itinerary.

const local = z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo");

const listaDeLocais = z
  .array(local)
  .max(LOCAIS_MAX, `No máximo ${LOCAIS_MAX} locais`)
  .transform(dedupe);

export const TripRequestInputSchema = z
  .object({
    regioes: z
      .array(z.enum(SUBREGIAO_IDS, "Região inválida"), "Escolha pelo menos uma região")
      .min(1, "Escolha pelo menos uma região")
      .max(REGIOES_MAX, `No máximo ${REGIOES_MAX} regiões`)
      .transform((r) => [...new Set(r)]),
    data_inicio: z.iso.date("Data de saída inválida"),
    data_fim: z.iso.date("Data de retorno inválida"),
    flexibilidade_dias_ida: z.int().min(0).max(FLEXIBILIDADE_MAX_DIAS).default(0),
    flexibilidade_dias_volta: z.int().min(0).max(FLEXIBILIDADE_MAX_DIAS).default(0),
    auge_da_viagem: z.string().trim().min(2, "Conte qual é o auge da viagem").max(120),
    locais_desejados_complementares: listaDeLocais.default([]),
    locais_a_evitar: listaDeLocais.default([]),
    cidade_origem: z.string().trim().min(2, "Informe a cidade de origem").max(120),
    aceita_outros_aeroportos: z.boolean().default(false),
    ritmo_viagem: z.enum(RITMO_IDS, "Escolha um ritmo"),
    orcamento: z.enum(ORCAMENTO_IDS, "Escolha uma faixa de orçamento").default("medio"),
    adultos: z.int("Informe quantos adultos").min(1, "Pelo menos 1 adulto").max(20).default(2),
    criancas: z.int().min(0).max(20).default(0),
    interesses: z.array(z.enum(INTERESSES)).max(INTERESSES.length).default([]),
    observacoes: z.string().trim().max(2000, "Máximo de 2000 caracteres").default(""),
  })
  .superRefine((v, ctx) => {
    const erroDatas = checarDatas(v.data_inicio, v.data_fim);
    if (erroDatas) ctx.addIssue({ code: "custom", path: ["data_fim"], message: erroDatas });
    const erroLocais = checarLocais(v.locais_desejados_complementares, v.locais_a_evitar, v.auge_da_viagem);
    if (erroLocais) ctx.addIssue({ code: "custom", path: ["locais_a_evitar"], message: erroLocais });
  });

// Regras entre campos, separadas do schema porque o Zod só roda o superRefine quando o objeto
// inteiro é válido: o wizard precisa delas na etapa em que os campos aparecem.

export function checarDatas(inicio: string, fim: string): string | null {
  const dias = diasEntre(inicio, fim);
  if (Number.isNaN(dias)) return null;
  if (dias < 1) return "O retorno precisa ser depois da saída";
  if (dias > VIAGEM_MAX_DIAS) return `Viagens de até ${VIAGEM_MAX_DIAS} dias`;
  return null;
}

export function checarLocais(desejados: string[], evitar: string[], auge = ""): string | null {
  const chavesEvitar = new Set(evitar.map(normalizarNome));
  const conflito = desejados.find((l) => chavesEvitar.has(normalizarNome(l)));
  if (conflito) return `"${conflito}" está nas duas listas`;
  if (auge && chavesEvitar.has(normalizarNome(auge))) return "O auge da viagem não pode ser evitado";
  return null;
}

export type TripRequestInput = z.infer<typeof TripRequestInputSchema>;
/** Formato aceito antes dos defaults (estado do formulário). */
export type TripRequestDraft = z.input<typeof TripRequestInputSchema>;

/** O que vai para a IA: as respostas mais o total de dias calculado no servidor. */
export type ItineraryPromptInput = TripRequestInput & { total_dias_viagem: number };

export function toPromptInput(input: TripRequestInput): ItineraryPromptInput {
  return { ...input, total_dias_viagem: diasEntre(input.data_inicio, input.data_fim) };
}

// ---------------------------------------------------------------------------
// Mapeamento PRD <-> colunas de trip_requests
// ---------------------------------------------------------------------------

type TripRequestInsert = Omit<
  TablesInsert<"trip_requests">,
  "id" | "user_id" | "status" | "error_message" | "total_days" | "created_at" | "updated_at" | "product" | "base_itinerary_id"
>;

/** Pedidos antigos têm só a região única (e ids antigos da Europa). */
export function regioesDaLinha(row: { regions?: string[] | null; subregion?: string | null }): SubregiaoId[] {
  const lista = row.regions?.length ? row.regions : row.subregion ? [row.subregion] : [];
  return [...new Set(lista.map((r) => SUBREGIOES_ANTIGAS[r] ?? r))] as SubregiaoId[];
}

export function toTripRequestRow(input: TripRequestInput): TripRequestInsert {
  return {
    subregion: input.regioes[0],
    regions: input.regioes,
    budget_level: input.orcamento,
    adults: input.adultos,
    children: input.criancas,
    interests: input.interesses,
    start_date: input.data_inicio,
    end_date: input.data_fim,
    flex_days_outbound: input.flexibilidade_dias_ida,
    flex_days_return: input.flexibilidade_dias_volta,
    highlight: input.auge_da_viagem,
    desired_places: input.locais_desejados_complementares,
    avoided_places: input.locais_a_evitar,
    origin_city: input.cidade_origem,
    accepts_alternate_airports: input.aceita_outros_aeroportos,
    pace: input.ritmo_viagem,
    notes: input.observacoes,
  };
}

export function fromTripRequestRow(row: Required<TripRequestInsert>): TripRequestInput {
  return TripRequestInputSchema.parse({
    regioes: regioesDaLinha(row),
    orcamento: row.budget_level ?? undefined,
    adultos: row.adults,
    criancas: row.children,
    interesses: row.interests,
    data_inicio: row.start_date,
    data_fim: row.end_date,
    flexibilidade_dias_ida: row.flex_days_outbound,
    flexibilidade_dias_volta: row.flex_days_return,
    auge_da_viagem: row.highlight,
    locais_desejados_complementares: row.desired_places,
    locais_a_evitar: row.avoided_places,
    cidade_origem: row.origin_city,
    aceita_outros_aeroportos: row.accepts_alternate_airports,
    ritmo_viagem: row.pace,
    observacoes: row.notes,
  });
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Dias entre duas datas ISO (2026-09-10 → 2026-09-25 = 15), igual a end_date - start_date no Postgres. */
export function diasEntre(inicio: string, fim: string): number {
  return Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000);
}

/** "  Milão " e "milao" viram a mesma chave. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupe(lista: string[]): string[] {
  const vistos = new Set<string>();
  return lista.filter((l) => {
    const k = normalizarNome(l);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}
