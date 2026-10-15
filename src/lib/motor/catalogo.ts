import "server-only";
import { createClient } from "@supabase/supabase-js";
import { lerConfig } from "@/lib/configuracoes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type ItemCatalogo = {
  id: string;
  titulo: string;
  duracao_dias: number;
  resumo: string;
  epoca: string | null;
  paises: string[];
  essencia: string[];
  cidades: string[];
};

/** Vitrine pública dos roteiros assinados (função do banco que só expõe dados de vitrine). */
export async function catalogoAssinados(): Promise<ItemCatalogo[]> {
  try {
    // Sem cookies: a vitrine é pública e pode ficar em cache
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave) return [];
    const supabase = createClient<Database>(url, chave, { auth: { persistSession: false } });
    const { data } = await supabase.rpc("catalogo_roteiros_assinados");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function precoAssinado(): Promise<number> {
  try {
    const precos = await lerConfig<Record<string, number>>(createAdminClient(), "precos_produtos", {});
    return precos.assinado ?? 14.9;
  } catch {
    return 14.9;
  }
}

export const formatarPreco = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
