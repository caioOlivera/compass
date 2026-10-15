import {
  checarDatas,
  checarLocais,
  TripRequestInputSchema,
  type TripRequestDraft,
} from "@/lib/validation/trip-request";

// Etapas do questionário (PRD seção 2.3) e a validação de cada uma.

export type CampoPedido = keyof TripRequestDraft;

export const ETAPAS = [
  { id: "regiao", titulo: "Para onde você vai?", campos: ["continente_regiao"] },
  {
    id: "datas",
    titulo: "Quando?",
    campos: ["data_inicio", "data_fim", "flexibilidade_dias_ida", "flexibilidade_dias_volta"],
  },
  { id: "auge", titulo: "Qual é o auge da viagem?", campos: ["auge_da_viagem"] },
  { id: "locais", titulo: "O que mais entra (e o que fica de fora)?", campos: ["locais_desejados_complementares", "locais_a_evitar"] },
  { id: "origem", titulo: "De onde você sai?", campos: ["cidade_origem", "aceita_outros_aeroportos"] },
  { id: "ritmo", titulo: "Qual é o seu ritmo?", campos: ["ritmo_viagem"] },
  { id: "observacoes", titulo: "Algo mais que a gente deva saber?", campos: ["observacoes"] },
] as const satisfies readonly { id: string; titulo: string; campos: readonly CampoPedido[] }[];

export type ErrosEtapa = Partial<Record<CampoPedido, string>>;

export const RASCUNHO_VAZIO: TripRequestDraft = {
  continente_regiao: undefined as unknown as TripRequestDraft["continente_regiao"],
  data_inicio: "",
  data_fim: "",
  flexibilidade_dias_ida: 0,
  flexibilidade_dias_volta: 0,
  auge_da_viagem: "",
  locais_desejados_complementares: [],
  locais_a_evitar: [],
  cidade_origem: "",
  aceita_outros_aeroportos: true,
  ritmo_viagem: undefined as unknown as TripRequestDraft["ritmo_viagem"],
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
