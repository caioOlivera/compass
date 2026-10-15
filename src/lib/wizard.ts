import { SUBREGIAO_IDS, SUBREGIOES_ANTIGAS, type SubregiaoId } from "@/lib/constants";
import { SUGESTOES_AUGE } from "@/lib/sugestoes-auge";
import {
  checarDatas,
  checarLocais,
  normalizarNome,
  TripRequestInputSchema,
  type TripRequestDraft,
} from "@/lib/validation/trip-request";

// Etapas do questionário (PRD seção 2.3 + briefing da consultoria) e a validação de cada uma.

/** Rascunhos salvos antes das várias regiões: a região única vira a lista. */
export function migrarRascunho(salvo: Record<string, unknown>): Partial<TripRequestDraft> {
  const { continente_regiao, ...resto } = salvo as { continente_regiao?: string } & Partial<TripRequestDraft>;
  if (resto.regioes?.length || !continente_regiao) return resto;
  const id = SUBREGIOES_ANTIGAS[continente_regiao] ?? continente_regiao;
  return (SUBREGIAO_IDS as string[]).includes(id) ? { ...resto, regioes: [id as SubregiaoId] } : resto;
}

export type CampoPedido = keyof TripRequestDraft;

export const ETAPAS = [
  { id: "regiao", titulo: "Para onde você vai?", campos: ["regioes"] },
  {
    id: "datas",
    titulo: "Quando?",
    campos: ["data_inicio", "data_fim", "flexibilidade_dias_ida", "flexibilidade_dias_volta"],
  },
  { id: "auge", titulo: "Qual é o auge da viagem?", campos: ["auge_da_viagem"] },
  { id: "locais", titulo: "O que mais entra (e o que fica de fora)?", campos: ["locais_desejados_complementares", "locais_a_evitar"] },
  { id: "viajantes", titulo: "Quem vai e do que vocês gostam?", campos: ["adultos", "criancas", "orcamento", "interesses"] },
  { id: "origem", titulo: "De onde você sai?", campos: ["cidade_origem", "aceita_outros_aeroportos"] },
  { id: "ritmo", titulo: "Qual é o seu ritmo?", campos: ["ritmo_viagem"] },
  { id: "observacoes", titulo: "Algo mais que a gente deva saber?", campos: ["observacoes"] },
] as const satisfies readonly { id: string; titulo: string; campos: readonly CampoPedido[] }[];

export type ErrosEtapa = Partial<Record<CampoPedido, string>>;

export const RASCUNHO_VAZIO: TripRequestDraft = {
  regioes: [],
  data_inicio: "",
  data_fim: "",
  flexibilidade_dias_ida: 0,
  flexibilidade_dias_volta: 0,
  auge_da_viagem: "",
  locais_desejados_complementares: [],
  locais_a_evitar: [],
  // Saída padrão: São Paulo (o usuário troca se quiser)
  cidade_origem: "São Paulo",
  aceita_outros_aeroportos: true,
  ritmo_viagem: undefined as unknown as TripRequestDraft["ritmo_viagem"],
  orcamento: "medio",
  adultos: 2,
  criancas: 0,
  interesses: [],
  observacoes: "",
};

/** Erros só dos campos da etapa, incluindo as regras entre campos daquela etapa. */
export function validarEtapa(rascunho: TripRequestDraft, indice: number, hoje: string): ErrosEtapa {
  const etapa = ETAPAS[indice];
  const campos = new Set<string>(etapa.campos);
  const erros: ErrosEtapa = {};

  const r = TripRequestInputSchema.safeParse(rascunho);
  if (!r.success) {
    for (const i of r.error.issues) {
      const campo = String(i.path[0]) as CampoPedido;
      if (campos.has(campo)) erros[campo] ??= i.message;
    }
  }

  if (etapa.id === "datas") {
    if (rascunho.data_inicio && rascunho.data_inicio < hoje) erros.data_inicio ??= "A data de saída já passou";
    if (rascunho.data_inicio && rascunho.data_fim) {
      const e = checarDatas(rascunho.data_inicio, rascunho.data_fim);
      if (e) erros.data_fim ??= e;
    }
  }
  if (etapa.id === "locais") {
    const e = checarLocais(
      rascunho.locais_desejados_complementares ?? [],
      rascunho.locais_a_evitar ?? [],
      rascunho.auge_da_viagem,
    );
    if (e) erros.locais_a_evitar ??= e;
  }
  return erros;
}

/** Primeira etapa que contém algum dos campos com erro (para voltar até ela). */
export function etapaDoCampo(campos: string[]): number {
  const i = ETAPAS.findIndex((e) => e.campos.some((c) => campos.includes(c)));
  return i === -1 ? ETAPAS.length - 1 : i;
}

/** Data local no formato ISO (YYYY-MM-DD), para o min do input de data. */
export function hojeLocal(agora = new Date()): string {
  const d = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
}

export type InicioQuestionario = { regiao?: SubregiaoId; auge?: string };

/**
 * Lê `?regiao=&auge=` vindos da landing. Região desconhecida é ignorada; sem região, tenta
 * deduzi-la pelo auge quando ele é uma das sugestões de alguma região.
 */
export function inicioDaUrl(params: { regiao?: string | string[]; auge?: string | string[] }): InicioQuestionario {
  const um = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)?.trim();
  const bruta = um(params.regiao);
  const auge = um(params.auge)?.slice(0, 120) || undefined;
  let regiao: SubregiaoId | undefined =
    bruta && (SUBREGIAO_IDS as string[]).includes(bruta) ? (bruta as SubregiaoId) : bruta ? SUBREGIOES_ANTIGAS[bruta] : undefined;
  if (!regiao && auge) {
    const chave = normalizarNome(auge);
    regiao = (Object.keys(SUGESTOES_AUGE) as SubregiaoId[]).find((id) =>
      SUGESTOES_AUGE[id].some((s) => normalizarNome(s.nome) === chave),
    );
  }
  return { ...(regiao ? { regiao } : {}), ...(auge ? { auge } : {}) };
}
