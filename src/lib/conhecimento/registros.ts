import type {
  Custo,
  DestinoExtraido,
  DicaExtraida,
  EventoExtraido,
  LugarExtraido,
  RoteiroExtraido,
  TrechoExtraido,
} from "@/lib/conhecimento/extracao";
import { normalizarNome } from "@/lib/validation/trip-request";

// Regras puras da base: chaves de deduplicação, mesclagem de registros e o texto usado na busca.

/** Chave de deduplicação: sem acento, minúsculas, sem artigos de abertura ("O Coliseu" = "Coliseu"). */
export function nomeChave(nome: string): string {
  return normalizarNome(nome).replace(/^(o|a|os|as|the|la|le|il|el)\s+/, "");
}

const NOMES_PAIS = new Intl.DisplayNames(["pt-BR"], { type: "region" });

/** "TH" → "Tailândia" */
export function nomePais(codigo: string): string {
  try {
    return NOMES_PAIS.of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}

const ROTULO_TIPO_LUGAR: Record<LugarExtraido["tipo"], string> = {
  atracao: "atração",
  passeio: "passeio",
  restaurante: "restaurante",
  hospedagem: "hospedagem",
  bar: "bar",
  compras: "compras",
  operador: "operador de passeios",
};

const ROTULO_MEIO: Record<TrechoExtraido["meio"], string> = {
  voo: "voo",
  trem: "trem",
  ferry: "ferry",
  barco: "barco",
  onibus: "ônibus",
  carro: "carro",
  taxi: "táxi",
  outro: "outro meio",
};

export function rotuloLugar(tipo: LugarExtraido["tipo"]) {
  return ROTULO_TIPO_LUGAR[tipo];
}
export function rotuloMeio(meio: TrechoExtraido["meio"]) {
  return ROTULO_MEIO[meio];
}

export function formatarCusto(c: Custo | null | undefined): string | null {
  if (!c) return null;
  const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: c.moeda, maximumFractionDigits: 2 }).format(c.valor);
  const ref = c.ref ? ` (ref. ${c.ref.slice(5)}/${c.ref.slice(0, 4)})` : "";
  return `${valor}${c.obs ? ` ${c.obs}` : ""}${ref}`;
}

export function formatarDuracao(min: number | null | undefined): string | null {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${String(m).padStart(2, "0")}min` : ""}` : `${m}min`;
}

// ---------------------------------------------------------------------------------------------
// Texto de busca (vai para o embedding e para a busca por palavras)

export function textoBuscaDestino(d: DestinoExtraido): string {
  const local = d.tipo === "pais" ? d.nome : `${d.nome}, ${nomePais(d.pais_codigo)}`;
  return [`Destino: ${local}.`, d.resumo, d.visto ? `Visto: ${d.visto}` : null].filter(Boolean).join(" ");
}

export function textoBuscaLugar(l: LugarExtraido): string {
  return [
    `${l.nome} (${rotuloLugar(l.tipo)}) em ${l.destino}, ${nomePais(l.pais_codigo)}.`,
    l.resumo,
    l.tags.length ? `Tags: ${l.tags.join(", ")}.` : null,
    formatarCusto(l.custo) ? `Custo: ${formatarCusto(l.custo)}.` : null,
    l.veredito === "evitar" ? "Não recomendado." : l.veredito === "recomendado" ? "Recomendado." : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function textoBuscaTrecho(t: TrechoExtraido): string {
  return [
    `Como ir de ${t.origem} para ${t.destino}: ${rotuloMeio(t.meio)}.`,
    formatarDuracao(t.duracao_min) ? `Duração: ${formatarDuracao(t.duracao_min)}.` : null,
    formatarCusto(t.custo) ? `Custo: ${formatarCusto(t.custo)}.` : null,
    t.operador ? `Operador: ${t.operador}.` : null,
    t.obs,
  ]
    .filter(Boolean)
    .join(" ");
}

export function textoBuscaDica(d: DicaExtraida): string {
  return `Dica (${d.categoria}) para ${d.lugar ? `${d.lugar}, ` : ""}${d.destino}, ${nomePais(d.pais_codigo)}: ${d.texto}`;
}

export function textoBuscaEvento(e: EventoExtraido): string {
  return `Evento em ${e.destino}, ${nomePais(e.pais_codigo)}: ${e.nome}. Data: ${e.regra_data}.`;
}

export function textoBuscaRoteiro(r: RoteiroExtraido): string {
  const cidades = [...new Set(r.dias.map((d) => d.cidade))].join(" → ");
  return [`Roteiro: ${r.titulo} (${r.duracao_dias} dias). ${cidades}.`, r.epoca ? `Época: ${r.epoca}.` : null, r.resumo]
    .filter(Boolean)
    .join(" ");
}

// ---------------------------------------------------------------------------------------------
// Mesclagem: o que já existe na base ganha os campos que faltavam

/** Preenche só o que está vazio no existente; listas viram união. */
export function preencherVazios<T extends Record<string, unknown>>(existente: T, novo: Partial<T>): Partial<T> {
  const mudancas: Partial<T> = {};
  for (const [k, v] of Object.entries(novo) as [keyof T, unknown][]) {
    const atual = existente[k];
    if (Array.isArray(atual) && Array.isArray(v)) {
      const uniao = [...new Set([...atual, ...v])];
      if (uniao.length !== atual.length) mudancas[k] = uniao as T[keyof T];
    } else if ((atual === null || atual === undefined || atual === "") && v !== null && v !== undefined && v !== "") {
      mudancas[k] = v as T[keyof T];
    }
  }
  return mudancas;
}
