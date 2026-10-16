import { z } from "zod";
import type { Itinerary } from "@/lib/validation/itinerary";
import { iataDaOrigem, iatasDoTexto } from "./aeroportos";
import type { ConsultaHotel, ConsultaVoo, OfertaHotel, OfertaVoo } from "./tipos";

// Parte pura do produto "completo": quais trechos de voo e quais estadias cotar a partir do
// roteiro, e o formato guardado em generated_itineraries.extras.

export type PedidoBase = { cidade_origem: string; data_inicio: string; data_fim: string; adultos: number; criancas: number };

export type TrechoPlanejado = { rotulo: string; consulta: ConsultaVoo };
export type EstadiaPlanejada = { id_ponto: string; noites: number; consulta: ConsultaHotel };

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Origem, entrada e saída: do campo `aeroportos` do roteiro; senão, do texto da logística e da cidade de origem. */
export function aeroportosDoRoteiro(roteiro: Itinerary, cidadeOrigem: string) {
  const a = roteiro.resumo_estrategico.aeroportos;
  const doTexto = iatasDoTexto(roteiro.resumo_estrategico.logistica_voos);
  return {
    origem: a?.origem ?? iataDaOrigem(cidadeOrigem),
    entrada: a?.entrada ?? doTexto[0] ?? null,
    saida: a?.saida ?? doTexto.at(-1) ?? null,
  };
}

/**
 * Voo internacional: mesmo aeroporto na entrada e na saída vira ida e volta; open-jaw vira dois
 * trechos só de ida (o bilhete multidestino costuma sair mais barato, e a tela avisa).
 */
export function trechosDoRoteiro(roteiro: Itinerary, p: PedidoBase): TrechoPlanejado[] {
  const { origem, entrada, saida } = aeroportosDoRoteiro(roteiro, p.cidade_origem);
  if (!origem || !entrada) return [];
  const pessoas = { adultos: p.adultos, criancas: p.criancas };
  if (!saida || saida === entrada) {
    return [{ rotulo: "Ida e volta", consulta: { origem, destino: entrada, ida: p.data_inicio, volta: p.data_fim, ...pessoas } }];
  }
  return [
    { rotulo: "Ida", consulta: { origem, destino: entrada, ida: p.data_inicio, ...pessoas } },
    { rotulo: "Volta", consulta: { origem: saida, destino: origem, ida: p.data_fim, ...pessoas } },
  ];
}

/** Uma estadia por parada, em sequência a partir da data de chegada. A última parada dorme um dia a menos. */
export function estadiasDoRoteiro(roteiro: Itinerary, p: PedidoBase, maxCidades = 8): EstadiaPlanejada[] {
  const pontos = [...roteiro.pontos_mapa].sort((a, b) => a.ordem - b.ordem);
  const estadias: EstadiaPlanejada[] = [];
  let dia = 0;
  pontos.forEach((pt, i) => {
    const noites = i === pontos.length - 1 ? pt.dias_alocados - 1 : pt.dias_alocados;
    const checkin = somarDias(p.data_inicio, dia);
    dia += pt.dias_alocados;
    if (noites < 1) return;
    estadias.push({
      id_ponto: pt.id_ponto,
      noites,
      consulta: { cidade: pt.nome_local, checkin, checkout: somarDias(checkin, noites), adultos: p.adultos, criancas: p.criancas },
    });
  });
  // Mais de N cidades: as que têm mais noites (custo de API limitado por roteiro)
  if (estadias.length <= maxCidades) return estadias;
  const manter = new Set([...estadias].sort((a, b) => b.noites - a.noites).slice(0, maxCidades).map((e) => e.id_ponto));
  return estadias.filter((e) => manter.has(e.id_ponto));
}

export type TrechoCotado = {
  rotulo: string;
  consulta: ConsultaVoo;
  provedor: string | null;
  cotado_em: string | null;
  ofertas: OfertaVoo[];
  link_busca: string;
};

export type EstadiaCotada = {
  id_ponto: string;
  cidade: string;
  checkin: string;
  checkout: string;
  noites: number;
  provedor: string | null;
  cotado_em: string | null;
  hoteis: OfertaHotel[];
  link_busca: string;
};

export type Extras = { versao: 1; gerado_em: string; trechos: TrechoCotado[]; estadias: EstadiaCotada[] };

export const ExtrasSchema = z.custom<Extras>((v) => !!v && typeof v === "object" && (v as Extras).versao === 1);

/** Lê o jsonb de extras (null quando o roteiro ainda não foi completado). */
export function lerExtras(v: unknown): Extras | null {
  const r = ExtrasSchema.safeParse(v);
  return r.success ? r.data : null;
}

/** Soma de referência por pessoa dos trechos cotados (null se faltar algum). */
export function totalPassagens(trechos: TrechoCotado[]): number | null {
  if (!trechos.length || trechos.some((t) => !t.ofertas[0]?.preco_brl)) return null;
  return trechos.reduce((a, t) => a + t.ofertas[0].preco_brl, 0);
}
