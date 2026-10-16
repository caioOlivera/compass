import { REGIOES_MAX, SUBREGIAO_IDS, type SubregiaoId } from "@/lib/constants";
import { dentroDaSubregiao } from "@/lib/geo/subregions";
import { TripRequestInputSchema, type TripRequestInput } from "@/lib/validation/trip-request";
import { z } from "zod";

// Parte pura do roteiro assinado: transforma o roteiro pronto + as escolhas do cliente num pedido
// que o motor entende (mesmas regras e validações de um roteiro gerado do zero).

export type DiaComLocal = { dia: number; cidade: string; lat: number | null; lng: number | null };

/** Regiões que contêm as cidades do roteiro, na ordem em que aparecem (até 4). */
export function regioesDoRoteiro(dias: DiaComLocal[]): SubregiaoId[] {
  const regioes: SubregiaoId[] = [];
  for (const d of [...dias].sort((a, b) => a.dia - b.dia)) {
    if (d.lat === null || d.lng === null) continue;
    const r = SUBREGIAO_IDS.find((id) => dentroDaSubregiao(id, { lat: d.lat!, lng: d.lng! }));
    if (r && !regioes.includes(r)) regioes.push(r);
  }
  return regioes.slice(0, REGIOES_MAX);
}

/** A cidade com mais dias é o auge; empate fica com a que aparece primeiro. */
export function cidadeAuge(dias: { dia: number; cidade: string }[]): string {
  const contagem = new Map<string, number>();
  for (const d of [...dias].sort((a, b) => a.dia - b.dia)) contagem.set(d.cidade, (contagem.get(d.cidade) ?? 0) + 1);
  let melhor = "";
  let max = 0;
  for (const [cidade, n] of contagem) if (n > max) [melhor, max] = [cidade, n];
  return melhor;
}

export function somarDias(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** O que o cliente escolhe na página do roteiro assinado. */
export const EscolhasAssinadoSchema = z.object({
  data_inicio: z.iso.date("Escolha a data de saída"),
  cidade_origem: z.string().trim().min(2, "Informe a cidade de origem").max(120).default("São Paulo"),
  adultos: z.int().min(1).max(20).default(2),
  criancas: z.int().min(0).max(20).default(0),
  orcamento: z.enum(["economico", "medio", "conforto", "luxo"]).default("medio"),
  ritmo_viagem: z.enum(["lento", "medio", "acelerado"]).default("medio"),
  observacoes: z.string().trim().max(2000).default(""),
  /** Dias da viagem inteira; a mais que o roteiro viram portas e cidades antes e depois do miolo */
  dias_viagem: z.int().min(1).max(90).optional(),
});
export type EscolhasAssinado = z.infer<typeof EscolhasAssinadoSchema>;

export function pedidoDoAssinado(
  base: { titulo: string; auge?: string | null; duracao_dias: number; dias: DiaComLocal[] },
  escolhas: EscolhasAssinado,
): TripRequestInput {
  const regioes = regioesDoRoteiro(base.dias);
  const cidades = [...new Set([...base.dias].sort((a, b) => a.dia - b.dia).map((d) => d.cidade))];
  const auge = base.auge?.trim() || cidadeAuge(base.dias) || base.titulo;
  return TripRequestInputSchema.parse({
    regioes: regioes.length ? regioes : undefined,
    data_inicio: escolhas.data_inicio,
    data_fim: somarDias(escolhas.data_inicio, Math.max(base.duracao_dias, Math.min(escolhas.dias_viagem ?? 0, base.duracao_dias + 21))),
    auge_da_viagem: auge.slice(0, 120),
    locais_desejados_complementares: cidades.filter((c) => c !== auge).slice(0, 15),
    locais_a_evitar: [],
    cidade_origem: escolhas.cidade_origem,
    aceita_outros_aeroportos: true,
    ritmo_viagem: escolhas.ritmo_viagem,
    orcamento: escolhas.orcamento,
    adultos: escolhas.adultos,
    criancas: escolhas.criancas,
    interesses: [],
    observacoes: [`Roteiro assinado: ${base.titulo}.`, escolhas.observacoes].filter(Boolean).join(" "),
  });
}
