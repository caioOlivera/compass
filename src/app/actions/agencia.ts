"use server";

import { revalidatePath } from "next/cache";
import { MarcaSchema, type Marca } from "@/lib/agencia";
import { planoDoUsuario } from "@/lib/creditos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Resultado = { ok: true; mensagem?: string } | { ok: false; mensagem: string };

async function sessao() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const SEM_PLANO = "O painel da agência abre quando o plano estiver pago.";
async function comPlano(userId: string) {
  const p = await planoDoUsuario(createAdminClient(), userId);
  return !!p?.plano;
}

export async function salvarMarca(marca: Marca): Promise<Resultado> {
  const { supabase, user } = await sessao();
  if (!user) return { ok: false, mensagem: "Entre de novo." };
  if (!(await comPlano(user.id))) return { ok: false, mensagem: SEM_PLANO };
  const r = MarcaSchema.safeParse(marca);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Dados inválidos." };
  const { data: org } = await supabase.rpc("minha_organizacao");
  if (!org) return { ok: false, mensagem: "Você não está numa agência." };
  // RLS: só o dono consegue atualizar
  const { data, error } = await supabase
    .from("organizacoes")
    .update({ nome: r.data.nome, cor: r.data.cor, contato: r.data.contato as Json })
    .eq("id", org)
    .select("id");
  if (error || !data?.length) return { ok: false, mensagem: "Só o dono da agência edita a marca." };
  revalidatePath("/agencia");
  return { ok: true, mensagem: "Marca salva." };
}

export async function definirLogo(caminho: string): Promise<Resultado> {
  const { supabase, user } = await sessao();
  if (!user) return { ok: false, mensagem: "Entre de novo." };
  if (!(await comPlano(user.id))) return { ok: false, mensagem: SEM_PLANO };
  const { data: org } = await supabase.rpc("minha_organizacao");
  if (!org || caminho.split("/")[0] !== org || caminho.split("/").length !== 2) return { ok: false, mensagem: "Arquivo inválido." };
  const { data, error } = await supabase.from("organizacoes").update({ logo_path: caminho }).eq("id", org).select("id");
  if (error || !data?.length) return { ok: false, mensagem: "Só o dono da agência troca o logo." };
  revalidatePath("/agencia");
  return { ok: true };
}

const MENSAGEM_MEMBRO: Record<string, string> = {
  ok: "Pessoa adicionada.",
  sem_conta: "Não achamos conta com esse e-mail. Peça para a pessoa se cadastrar primeiro.",
  ja_em_agencia: "Essa pessoa já faz parte de uma agência.",
  limite: "Limite de 20 pessoas por agência.",
};

export async function adicionarMembro(email: string): Promise<Resultado> {
  const { supabase, user } = await sessao();
  if (!user) return { ok: false, mensagem: "Entre de novo." };
  if (!(await comPlano(user.id))) return { ok: false, mensagem: SEM_PLANO };
  const { data, error } = await supabase.rpc("adicionar_membro", { p_email: email });
  if (error) return { ok: false, mensagem: "Só o dono da agência adiciona pessoas." };
  revalidatePath("/agencia");
  return data === "ok" ? { ok: true, mensagem: MENSAGEM_MEMBRO.ok } : { ok: false, mensagem: MENSAGEM_MEMBRO[data] ?? "Não foi possível adicionar." };
}

/** Remoção pelo servidor: confere na sessão que quem pede é o dono e só remove membros comuns. */
export async function removerMembro(userId: string): Promise<Resultado> {
  const { supabase, user } = await sessao();
  if (!user) return { ok: false, mensagem: "Entre de novo." };
  const [{ data: org }, { data: dono }] = await Promise.all([supabase.rpc("minha_organizacao"), supabase.rpc("sou_dono_da_organizacao")]);
  if (!org || !dono) return { ok: false, mensagem: "Só o dono da agência remove pessoas." };
  if (userId === user.id) return { ok: false, mensagem: "O dono não sai da própria agência." };
  const { error } = await createAdminClient()
    .from("organizacao_membros")
    .delete()
    .eq("organizacao_id", org)
    .eq("user_id", userId)
    .eq("papel", "membro");
  if (error) return { ok: false, mensagem: "Não foi possível remover." };
  revalidatePath("/agencia");
  return { ok: true };
}
