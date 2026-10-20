import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Direitos do titular (LGPD art. 18): acesso/portabilidade (exportar) e eliminação (excluir a conta).
// Tudo com o cliente de serviço, sempre filtrado pelo id de quem pediu.

type Db = SupabaseClient<Database>;

export const hashEmail = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

/** Tudo o que a Compass guarda sobre a pessoa, num JSON legível. */
export async function exportarDados(db: Db, user: { id: string; email?: string | null; created_at: string; user_metadata?: Record<string, unknown> }) {
  const uid = user.id;
  const [perfil, consultas, roteiros, pedidos, creditos, consultorias, chamados, membros] = await Promise.all([
    db.from("profiles").select("full_name, phone, avatar_path, created_at, updated_at").eq("id", uid).maybeSingle(),
    db.from("trip_requests").select("*").eq("user_id", uid).order("created_at"),
    db.from("generated_itineraries").select("id, trip_request_id, version, itinerary, extras, created_at").eq("user_id", uid).order("created_at"),
    db.from("pedidos").select("id, produto, valor, status, metodo, pago_em, termos_aceitos_em, created_at").eq("user_id", uid).order("created_at"),
    db.from("creditos").select("tipo, quantidade, motivo, valido_ate, created_at").eq("user_id", uid).order("created_at"),
    db.from("consultorias").select("id, status, briefing, created_at").eq("user_id", uid),
    db.from("chamados").select("id, assunto, categoria, status, created_at").eq("user_id", uid),
    db.from("organizacao_membros").select("organizacao_id, papel, created_at").eq("user_id", uid),
  ]);
  const idsChamados = (chamados.data ?? []).map((c) => c.id);
  const { data: mensagens } = idsChamados.length
    ? await db.from("chamado_mensagens").select("chamado_id, autor, texto, created_at").in("chamado_id", idsChamados).order("created_at")
    : { data: [] };

  return {
    gerado_em: new Date().toISOString(),
    conta: {
      id: uid,
      email: user.email ?? null,
      criada_em: user.created_at,
      termos_aceitos_em: user.user_metadata?.termos_aceitos_em ?? null,
      versao_termos: user.user_metadata?.versao_termos ?? null,
    },
    perfil: perfil.data,
    consultas: consultas.data ?? [],
    roteiros: roteiros.data ?? [],
    pedidos: pedidos.data ?? [],
    creditos: creditos.data ?? [],
    consultorias: consultorias.data ?? [],
    chamados: (chamados.data ?? []).map((c) => ({ ...c, mensagens: (mensagens ?? []).filter((m) => m.chamado_id === c.id) })),
    agencias: membros.data ?? [],
  };
}

export type ResultadoExclusao = { ok: true } | { ok: false; mensagem: string };

/**
 * Exclui a conta. Antes: guarda os pedidos pagos sem identificação (obrigação fiscal, 5 anos),
 * guarda o hash do e-mail (o roteiro de boas-vindas não volta numa conta nova) e apaga as fotos.
 * O resto sai em cascata com o usuário.
 */
export async function excluirConta(db: Db, user: { id: string; email?: string | null }): Promise<ResultadoExclusao> {
  const uid = user.id;

  // Dono de agência com plano ativo cancela o plano antes, para a cobrança não continuar
  const { data: donos } = await db.from("organizacao_membros").select("organizacao_id").eq("user_id", uid).eq("papel", "dono");
  const orgs = (donos ?? []).map((d) => d.organizacao_id);
  if (orgs.length) {
    const { count } = await db.from("assinaturas").select("id", { count: "exact", head: true }).in("organizacao_id", orgs).eq("status", "ativa");
    if (count) return { ok: false, mensagem: "Sua agência tem um plano ativo. Cancele a assinatura no Mercado Pago antes de excluir a conta, ou fale com o suporte." };
  }

  const { data: pagos } = await db.from("pedidos").select("*").eq("user_id", uid).not("pago_em", "is", null);
  if (pagos?.length) {
    const { error } = await db.from("pedidos_arquivados").upsert(
      pagos.map((p) => ({
        id: p.id,
        produto: p.produto,
        valor: Number(p.valor),
        status: p.status,
        provedor: p.provedor,
        provedor_id: p.provedor_id,
        metodo: p.metodo,
        pago_em: p.pago_em,
        criado_em: p.created_at,
      })),
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) return { ok: false, mensagem: "Não foi possível excluir agora. Tente de novo em instantes." };
  }

  if (user.email) await db.from("contas_excluidas").upsert({ email_hash: hashEmail(user.email) }, { onConflict: "email_hash", ignoreDuplicates: true });

  const { data: fotos } = await db.storage.from("avatars").list(uid, { limit: 100 });
  if (fotos?.length) await db.storage.from("avatars").remove(fotos.map((f) => `${uid}/${f.name}`));

  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) {
    console.error("[lgpd] excluir conta", uid, error);
    return { ok: false, mensagem: "Não foi possível excluir agora. Tente de novo em instantes." };
  }
  return { ok: true };
}

/** Limpeza dos prazos de guarda da Política de Privacidade. Roda no cron diário. */
export async function limparPrazosVencidos(db: Db) {
  const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const r = await Promise.all([
    db.from("cotacoes").delete().lt("cotado_em", dias(30)),
    db.from("webhooks_recebidos").delete().lt("created_at", dias(90)),
    db.from("chamados").delete().eq("status", "fechado").lt("updated_at", dias(730)),
    db.from("pedidos_arquivados").delete().lt("apagar_apos", new Date().toISOString()),
    db.from("eventos_uso").delete().lt("created_at", dias(180)),
  ]);
  for (const x of r) if (x.error) console.error("[lgpd] limpeza", x.error.message);
}
