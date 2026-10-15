import { z } from "zod";
import {
  FLEXIBILIDADE_MAX_DIAS,
  LOCAIS_MAX,
  RITMO_IDS,
  SUBREGIAO_IDS,
  VIAGEM_MAX_DIAS,
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
    continente_regiao: z.enum(SUBREGIAO_IDS, "Escolha uma sub-região"),
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
    observacoes: z.string().trim().max(2000, "Máximo de 2000 caracteres").default(""),
  })
  .superRefine((v, ctx) => {
    const dias = diasEntre(v.data_inicio, v.data_fim);
    if (dias < 1) {
      ctx.addIssue({ code: "custom", path: ["data_fim"], message: "O retorno precisa ser depois da saída" });
    } else if (dias > VIAGEM_MAX_DIAS) {
      ctx.addIssue({ code: "custom", path: ["data_fim"], message: `Viagens de até ${VIAGEM_MAX_DIAS} dias` });
    }
    const evitar = new Set(v.locais_a_evitar.map(normalizarNome));
    const conflito = v.locais_desejados_complementares.find((l) => evitar.has(normalizarNome(l)));
    if (conflito) {
      ctx.addIssue({
        code: "custom",
        path: ["locais_a_evitar"],
        message: `"${conflito}" está nas duas listas`,
      });
    }
    if (evitar.has(normalizarNome(v.auge_da_viagem))) {
      ctx.addIssue({ code: "custom", path: ["locais_a_evitar"], message: "O auge da viagem não pode ser evitado" });
    }
  });

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

type TripRequestInsert = Omit<TablesInsert<"trip_requests">, "id" | "user_id" | "status" | "error_message" | "total_days" | "created_at" | "updated_at">;

export function toTripRequestRow(input: TripRequestInput): TripRequestInsert {
  return {
    subregion: input.continente_regiao,
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
    continente_regiao: row.subregion,
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
