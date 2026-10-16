"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { enviarEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { urlDoSite } from "@/lib/pagamentos/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true; id?: string; mensagem?: string } | { ok: false; mensagem: string };

const NovoSchema = z.object({
  assunto: z.string().trim().min(3, "Escreva um assunto curto").max(140),
  categoria: z.enum(["roteiro", "pagamento", "conta", "agencia", "consultoria", "outro"]).default("outro"),
  texto: z.string().trim().min(10, "Conte um pouco mais (pelo menos 10 caracteres)").max(5000),
});
const TextoSchema = z.string().trim().min(1, "Escreva a mensagem").max(5000);

async function usuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Avisa a caixa de suporte (SUPORTE_EMAIL) quando o cliente escreve. Sem e-mail configurado, só o painel mostra. */
async function avisarSuporte(chamadoId: string, assunto: string, texto: string, emailCliente?: string) {
  const para = serverEnv().SUPORTE_EMAIL;
  if (!para) return;
  await enviarEmail({
    para,
    assunto: `[Compass] ${assunto}`,
    texto: `${texto}\n\n— ${emailCliente ?? "cliente"}\nResponder no painel: ${urlDoSite()}/admin/suporte#${chamadoId}`,
    responderPara: emailCliente,
  });
}

export async function abrirChamado(dados: z.input<typeof NovoSchema>): Promise<Resultado> {
  const { user } = await usuario();
  if (!user) return { ok: false, mensagem: "Entre na sua conta para abrir um chamado." };
  const r = NovoSchema.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Confira os campos." };
  const db = createAdminClient();

  // Contra spam: até 5 chamados novos por dia por pessoa
  const { count } = await db
    .from("chamados")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 5) return { ok: false, mensagem: "Você já abriu 5 chamados hoje. Responda num chamado aberto." };

  const { data: chamado, error } = await db
    .from("chamados")
    .insert({ user_id: user.id, assunto: r.data.assunto, categoria: r.data.categoria })
    .select("id")
    .single();
  if (error || !chamado) return { ok: false, mensagem: "Não foi possível abrir o chamado." };
  await db.from("chamado_mensagens").insert({ chamado_id: chamado.id, autor: "cliente", autor_id: user.id, texto: r.data.texto });
  await avisarSuporte(chamado.id, r.data.assunto, r.data.texto, user.email);
  revalidatePath("/ajuda");
  return { ok: true, id: chamado.id };
}

export async function responderComoCliente(chamadoId: string, texto: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { ok: false, mensagem: "Entre de novo." };
  const t = TextoSchema.safeParse(texto);
  if (!t.success) return { ok: false, mensagem: t.error.issues[0]?.message ?? "Mensagem inválida." };
  // RLS: só o dono enxerga o chamado
  const { data: chamado } = await supabase.from("chamados").select("id, assunto, user_id").eq("id", chamadoId).maybeSingle();
  if (!chamado || chamado.user_id !== user.id) return { ok: false, mensagem: "Chamado não encontrado." };
  const db = createAdminClient();
  await db.from("chamado_mensagens").insert({ chamado_id: chamadoId, autor: "cliente", autor_id: user.id, texto: t.data });
  await db.from("chamados").update({ status: "aberto" }).eq("id", chamadoId);
  await avisarSuporte(chamadoId, `Re: ${chamado.assunto}`, t.data, user.email);
  revalidatePath(`/ajuda/${chamadoId}`);
  return { ok: true };
}

export async function encerrarChamado(chamadoId: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { ok: false, mensagem: "Entre de novo." };
  const { data: chamado } = await supabase.from("chamados").select("id, user_id").eq("id", chamadoId).maybeSingle();
  if (!chamado || chamado.user_id !== user.id) return { ok: false, mensagem: "Chamado não encontrado." };
  await createAdminClient().from("chamados").update({ status: "fechado" }).eq("id", chamadoId);
  revalidatePath(`/ajuda/${chamadoId}`);
  revalidatePath("/ajuda");
  return { ok: true };
}

/** Resposta da equipe pelo painel; o cliente recebe um e-mail avisando (se o e-mail estiver configurado). */
export async function responderComoEquipe(chamadoId: string, texto: string, fechar = false): Promise<Resultado> {
  const { user } = await exigirAdmin();
  const t = TextoSchema.safeParse(texto);
  if (!t.success) return { ok: false, mensagem: t.error.issues[0]?.message ?? "Mensagem inválida." };
  const db = createAdminClient();
  const { data: chamado } = await db.from("chamados").select("id, assunto, user_id").eq("id", chamadoId).maybeSingle();
  if (!chamado) return { ok: false, mensagem: "Chamado não encontrado." };
  await db.from("chamado_mensagens").insert({ chamado_id: chamadoId, autor: "equipe", autor_id: user.id, texto: t.data });
  await db.from("chamados").update({ status: fechar ? "fechado" : "respondido" }).eq("id", chamadoId);

  const { data: cliente } = await db.auth.admin.getUserById(chamado.user_id);
  if (cliente.user?.email) {
    await enviarEmail({
      para: cliente.user.email,
      assunto: `Re: ${chamado.assunto}`,
      texto: `${t.data}\n\nVer a conversa e responder: ${urlDoSite()}/ajuda/${chamadoId}`,
      responderPara: serverEnv().SUPORTE_EMAIL,
    });
  }
  revalidatePath("/admin/suporte");
  return { ok: true, mensagem: fechar ? "Respondido e encerrado." : "Resposta enviada." };
}
