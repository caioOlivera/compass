"use server";

import { redirect } from "next/navigation";
import { excluirConta } from "@/lib/lgpd";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Titular pede a exclusão da conta. Confirma digitando EXCLUIR. */
export async function excluirMinhaConta(confirmacao: string): Promise<{ ok: false; mensagem: string }> {
  if (confirmacao.trim().toUpperCase() !== "EXCLUIR") return { ok: false, mensagem: "Digite EXCLUIR para confirmar." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensagem: "Sua sessão expirou. Entre de novo." };

  const r = await excluirConta(createAdminClient(), user);
  if (!r.ok) return r;
  await supabase.auth.signOut().catch(() => {});
  redirect("/?conta=excluida");
}
