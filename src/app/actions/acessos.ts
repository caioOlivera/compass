"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type Resultado = { ok: boolean; mensagem: string };

const ConcederSchema = z.object({
  email: z.email("E-mail inválido").trim().toLowerCase(),
  /** Dias de acesso; null = sem prazo */
  dias: z.int().min(1).max(3650).nullable(),
  motivo: z.string().trim().max(200).default(""),
});

/** Libera tudo (com passagens e hotéis) para um e-mail, com ou sem prazo. A conta pode ainda não existir. */
export async function concederAcesso(dados: z.input<typeof ConcederSchema>): Promise<Resultado> {
  const { user } = await exigirAdmin();
  const r = ConcederSchema.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Confira os campos." };
  const db = createAdminClient();

  // Liga à conta, se já existir (a busca por e-mail também cobre quem se cadastrar depois)
  const { data: conta } = await db.rpc("usuario_por_email", { p_email: r.data.email });
  const valido_ate = r.data.dias ? new Date(Date.now() + r.data.dias * 86_400_000).toISOString() : null;

  // Um acesso ativo por e-mail: o novo substitui o anterior
  await db.from("acessos_gratis").update({ revogado_em: new Date().toISOString() }).eq("email", r.data.email).is("revogado_em", null);
  const { error } = await db.from("acessos_gratis").insert({
    email: r.data.email,
    user_id: conta ?? null,
    valido_ate,
    motivo: r.data.motivo,
    concedido_por: user.id,
  });
  if (error) return { ok: false, mensagem: "Não foi possível conceder." };
  revalidatePath("/admin/acessos");
  return { ok: true, mensagem: valido_ate ? `Acesso liberado até ${new Date(valido_ate).toLocaleDateString("pt-BR")}.` : "Acesso liberado sem prazo." };
}

export async function revogarAcesso(id: string): Promise<Resultado> {
  await exigirAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, mensagem: "Acesso inválido." };
  const { error } = await createAdminClient().from("acessos_gratis").update({ revogado_em: new Date().toISOString() }).eq("id", id).is("revogado_em", null);
  if (error) return { ok: false, mensagem: "Não foi possível revogar." };
  revalidatePath("/admin/acessos");
  return { ok: true, mensagem: "Acesso revogado." };
}
