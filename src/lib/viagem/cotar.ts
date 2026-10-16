import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lerConfig } from "@/lib/configuracoes";
import { registrarUso } from "@/lib/medicao";
import type { Database, Json } from "@/types/database";
import type { Cotacao, ConsultaHotel, ConsultaVoo, OfertaHotel, OfertaVoo, ProvedorHoteis, ProvedorVoos } from "./tipos";

// Cotação com cache: a mesma consulta dentro da validade (config `validade_cotacao_horas`) volta do
// banco, sem chamar a API. Cada chamada real vira uma linha em eventos_uso com o custo.

type Db = SupabaseClient<Database>;

export function chaveVoo(provedor: string, c: ConsultaVoo) {
  return ["voo", provedor, c.origem, c.destino, c.ida, c.volta ?? "-", c.adultos, c.criancas ?? 0].join("|");
}
export function chaveHotel(provedor: string, c: ConsultaHotel) {
  return ["hotel", provedor, c.cidade.toLowerCase().trim(), c.checkin, c.checkout, c.adultos, c.criancas ?? 0].join("|");
}

async function comCache<T>(
  db: Db,
  tipo: "voo" | "hotel",
  provedor: string,
  chave: string,
  consulta: object,
  buscar: () => Promise<T[]>,
  uso: { userId?: string | null; tripRequestId?: string | null },
): Promise<Cotacao<T>> {
  const { data: guardada } = await db.from("cotacoes").select("resultado, cotado_em, expira_em").eq("chave", chave).maybeSingle();
  if (guardada && new Date(guardada.expira_em) > new Date()) {
    return { provedor, ofertas: guardada.resultado as T[], cotado_em: guardada.cotado_em, do_cache: true };
  }

  const horas = await lerConfig<{ voo: number; hotel: number }>(db, "validade_cotacao_horas", { voo: 24, hotel: 72 });
  const precos = await lerConfig<Record<string, number>>(db, "precos_apis", {});
  const inicio = Date.now();
  let ofertas: T[] = [];
  let erro: unknown = null;
  try {
    ofertas = await buscar();
  } catch (e) {
    erro = e;
  }
  await registrarUso(db, {
    tipo: tipo === "voo" ? "busca_voo" : "busca_hotel",
    userId: uso.userId,
    tripRequestId: uso.tripRequestId,
    provedor,
    unidades: 1,
    custoUsd: Number(precos[`${provedor}_busca`] ?? 0),
    sucesso: !erro,
    meta: { chave, ofertas: ofertas.length, latencia_ms: Date.now() - inicio },
  });
  if (erro) throw erro;

  const cotado_em = new Date().toISOString();
  // Resultado vazio também fica guardado, mas por menos tempo (a rota pode aparecer no cache deles depois)
  const validade = (ofertas.length ? (horas[tipo] ?? 24) : 6) * 3_600_000;
  await db.from("cotacoes").upsert({
    chave,
    tipo,
    provedor,
    consulta: consulta as Json,
    resultado: ofertas as Json,
    cotado_em,
    expira_em: new Date(Date.now() + validade).toISOString(),
  });
  return { provedor, ofertas, cotado_em, do_cache: false };
}

export function cotarVoo(db: Db, provedor: ProvedorVoos, c: ConsultaVoo, uso: { userId?: string | null; tripRequestId?: string | null } = {}) {
  return comCache<OfertaVoo>(db, "voo", provedor.nome, chaveVoo(provedor.nome, c), c, () => provedor.buscar(c), uso);
}

export function cotarHoteis(db: Db, provedor: ProvedorHoteis, c: ConsultaHotel, uso: { userId?: string | null; tripRequestId?: string | null } = {}) {
  return comCache<OfertaHotel>(db, "hotel", provedor.nome, chaveHotel(provedor.nome, c), c, () => provedor.buscar(c), uso);
}
