import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { custoTokens, type PrecosModelos } from "@/lib/medicao-custo";
import type { Database, Json } from "@/types/database";

// Medição de custo: toda chamada paga vira uma linha em eventos_uso, com o custo calculado pelos
// preços em configuracoes (editáveis sem deploy). Nunca derruba o fluxo principal.

type Db = SupabaseClient<Database>;

type Config = { precos: PrecosModelos; cambio: number; carregadoEm: number };
let cache: Config | null = null;

async function carregarConfig(db: Db): Promise<Config> {
  if (cache && Date.now() - cache.carregadoEm < 5 * 60_000) return cache;
  const { data } = await db.from("configuracoes").select("chave, valor").in("chave", ["precos_modelos", "cambio_usd_brl"]);
  const mapa = Object.fromEntries((data ?? []).map((c) => [c.chave, c.valor]));
  cache = {
    precos: (mapa.precos_modelos as PrecosModelos) ?? { padrao: { entrada: 0, saida: 0 } },
    cambio: Number(mapa.cambio_usd_brl ?? 5.4),
    carregadoEm: Date.now(),
  };
  return cache;
}

export type EventoUso = {
  tipo: Database["public"]["Tables"]["eventos_uso"]["Insert"]["tipo"];
  userId?: string | null;
  tripRequestId?: string | null;
  itineraryId?: string | null;
  produto?: string | null;
  provedor?: string | null;
  modelo?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  unidades?: number;
  /** Custo já conhecido em US$ (APIs que cobram por chamada); senão, calculado pelos tokens. */
  custoUsd?: number;
  sucesso?: boolean;
  meta?: Record<string, unknown>;
};

export async function registrarUso(db: Db, e: EventoUso): Promise<void> {
  try {
    const config = await carregarConfig(db);
    const custo =
      e.custoUsd !== undefined
        ? { usd: e.custoUsd, brl: e.custoUsd * config.cambio }
        : custoTokens(e.modelo ?? "", e.inputTokens ?? 0, e.outputTokens ?? 0, config.precos, config.cambio);
    const r = await db.from("eventos_uso").insert({
      tipo: e.tipo,
      user_id: e.userId ?? null,
      trip_request_id: e.tripRequestId ?? null,
      itinerary_id: e.itineraryId ?? null,
      produto: e.produto ?? null,
      provedor: e.provedor ?? null,
      modelo: e.modelo ?? null,
      input_tokens: e.inputTokens ?? 0,
      output_tokens: e.outputTokens ?? 0,
      unidades: e.unidades ?? 0,
      custo_usd: Number(custo.usd.toFixed(6)),
      custo_brl: Number(custo.brl.toFixed(4)),
      sucesso: e.sucesso ?? true,
      meta: (e.meta ?? {}) as Json,
    });
    if (r.error) console.error("[medicao]", r.error.message);
  } catch (err) {
    console.error("[medicao]", err);
  }
}
