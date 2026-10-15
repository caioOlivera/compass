"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin";
import type { Json } from "@/types/database";

/** Salva um valor de configuração (JSON). Só admin; a RLS também barra os demais. */
export async function salvarConfig(chave: string, valorJson: string): Promise<{ ok: boolean; erro?: string }> {
  const { supabase } = await exigirAdmin();
  let valor: Json;
  try {
    valor = JSON.parse(valorJson);
  } catch {
    return { ok: false, erro: "JSON inválido." };
  }
  const { error } = await supabase.from("configuracoes").update({ valor }).eq("chave", chave);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin/config");
  return { ok: true };
}
