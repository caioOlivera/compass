"use server";

import { revalidatePath } from "next/cache";
import { errosPorCampo } from "@/lib/validation/auth";
import { avatarDoDono, PerfilSchema } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

// Tudo com a sessão do usuário: a RLS e os grants de coluna limitam ao próprio perfil.

export type ResultadoPerfil = { ok: true } | { ok: false; erros?: Partial<Record<string, string>>; mensagem?: string };

export async function salvarPerfil(dados: { nome: string; telefone: string }): Promise<ResultadoPerfil> {
  const r = PerfilSchema.safeParse(dados);
  if (!r.success) return { ok: false, erros: errosPorCampo(r) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensagem: "Sua sessão expirou. Entre de novo." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: r.data.nome, phone: r.data.telefone })
    .eq("id", user.id);
  if (error) return { ok: false, mensagem: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Grava o novo caminho da foto (já enviada pelo navegador) e apaga a anterior. `null` remove a foto. */
export async function definirAvatar(caminho: string | null): Promise<ResultadoPerfil> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensagem: "Sua sessão expirou. Entre de novo." };
  if (caminho !== null && !avatarDoDono(user.id, caminho)) return { ok: false, mensagem: "Arquivo inválido." };

  const { data: atual } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_path: caminho }).eq("id", user.id);
  if (error) return { ok: false, mensagem: "Não foi possível salvar a foto. Tente de novo." };

  // A antiga sai do bucket; se falhar, sobra um arquivo órfão, sem efeito para a pessoa.
  if (atual?.avatar_path && atual.avatar_path !== caminho) {
    await supabase.storage.from("avatars").remove([atual.avatar_path]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
