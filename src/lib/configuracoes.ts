import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Números de negócio editáveis sem deploy (tabela configuracoes). Lidos pelo servidor (service_role).

export type ChaveConfig =
  | "ajustes_inclusos"
  | "validade_meses_b2c"
  | "reembolso_dias"
  | "uso_justo_premium"
  | "precos_produtos"
  | "creditos_basic_mes"
  | "cambio_usd_brl"
  | "precos_modelos"
  | "cobranca_ativa";

export async function lerConfig<T>(db: SupabaseClient<Database>, chave: ChaveConfig, padrao: T): Promise<T> {
  const { data } = await db.from("configuracoes").select("valor").eq("chave", chave).maybeSingle();
  return (data?.valor as T | undefined) ?? padrao;
}
