"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { lerConfig } from "@/lib/configuracoes";
import { PLANOS, PRODUTOS, precoDe, estornarPedido, type Plano, type ProdutoAvulso } from "@/lib/creditos";
import { criarAssinaturaMP, criarPreferencia, linkDoCheckout, MercadoPagoError, mercadoPagoConfigurado, reembolsar } from "@/lib/pagamentos/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Resultado = { ok: true; url?: string; mensagem?: string } | { ok: false; mensagem: string };

const SEM_PAGAMENTO = "O pagamento ainda não está ligado. Fale com a gente para comprar.";

async function usuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const ProdutoSchema = z.enum(["roteiro", "assinado", "completo", "consultoria"]);

/** Cria o pedido e devolve o link do Checkout Pro (Pix ou cartão). */
export async function iniciarCompra(produto: ProdutoAvulso, referencia: { roteiro_base_id?: string } = {}): Promise<Resultado> {
  const { user } = await usuario();
  if (!user) return { ok: false, mensagem: "Entre na sua conta para comprar." };
  const p = ProdutoSchema.safeParse(produto);
  if (!p.success) return { ok: false, mensagem: "Produto inválido." };
  if (!mercadoPagoConfigurado()) return { ok: false, mensagem: SEM_PAGAMENTO };

  const db = createAdminClient();
  const valor = await precoDe(db, p.data);
  const ref = referencia.roteiro_base_id && z.uuid().safeParse(referencia.roteiro_base_id).success ? { roteiro_base_id: referencia.roteiro_base_id } : {};
  const { data: pedido, error } = await db
    .from("pedidos")
    .insert({ user_id: user.id, produto: p.data, valor, referencia: ref as Json })
    .select("id")
    .single();
  if (error || !pedido) return { ok: false, mensagem: "Não foi possível criar o pedido." };

  try {
    const pref = await criarPreferencia({ pedidoId: pedido.id, titulo: `Compass: ${PRODUTOS[p.data].titulo}`, valor, email: user.email });
    return { ok: true, url: linkDoCheckout(pref) };
  } catch (e) {
    console.error("criarPreferencia", e);
    await db.from("pedidos").update({ status: "cancelado" }).eq("id", pedido.id);
    return { ok: false, mensagem: "O Mercado Pago não respondeu. Tente de novo em instantes." };
  }
}

/** Assinatura mensal da agência (só o dono). Devolve o link para autorizar o cartão no Mercado Pago. */
export async function assinarPlano(plano: Plano): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user?.email) return { ok: false, mensagem: "Entre de novo." };
  if (plano !== "basic" && plano !== "premium") return { ok: false, mensagem: "Plano inválido." };
  const [{ data: org }, { data: dono }] = await Promise.all([supabase.rpc("minha_organizacao"), supabase.rpc("sou_dono_da_organizacao")]);
  if (!org || !dono) return { ok: false, mensagem: "Só o dono da agência contrata o plano." };
  if (!mercadoPagoConfigurado()) return { ok: false, mensagem: SEM_PAGAMENTO };

  const db = createAdminClient();
  const valor = await precoDe(db, plano);
  const { data: assinatura, error } = await db
    .from("assinaturas")
    .insert({ organizacao_id: org, plano, criado_por: user.id })
    .select("id")
    .single();
  if (error || !assinatura) return { ok: false, mensagem: "Não foi possível iniciar a assinatura." };
  try {
    const mp = await criarAssinaturaMP({ assinaturaId: assinatura.id, titulo: PLANOS[plano].titulo, valor, email: user.email });
    await db.from("assinaturas").update({ provedor_id: mp.id }).eq("id", assinatura.id);
    if (!mp.init_point) return { ok: false, mensagem: "O Mercado Pago não devolveu o link da assinatura." };
    return { ok: true, url: mp.init_point };
  } catch (e) {
    console.error("criarAssinaturaMP", e);
    await db.from("assinaturas").update({ status: "cancelada" }).eq("id", assinatura.id);
    return { ok: false, mensagem: "O Mercado Pago não respondeu. Tente de novo em instantes." };
  }
}

const BriefingSchema = z.object({
  destino: z.string().trim().min(2, "Conte para onde quer ir").max(300),
  datas: z.string().trim().max(200).default(""),
  pessoas: z.string().trim().max(200).default(""),
  orcamento: z.string().trim().max(200).default(""),
  contato: z.string().trim().min(5, "Deixe um WhatsApp ou e-mail para o consultor falar com você").max(200),
  detalhes: z.string().trim().max(4000).default(""),
});
export type Briefing = z.input<typeof BriefingSchema>;

/** Cliente da consultoria envia o briefing; o pedido entra na fila do consultor. */
export async function enviarBriefing(consultoriaId: string, briefing: Briefing): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { ok: false, mensagem: "Entre de novo." };
  const r = BriefingSchema.safeParse(briefing);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Confira os campos." };
  // A RLS confirma que é dele e que ainda aguarda briefing; o status muda pelo servidor
  const { data } = await supabase.from("consultorias").update({ briefing: r.data as Json }).eq("id", consultoriaId).select("id");
  if (!data?.length) return { ok: false, mensagem: "Este briefing já foi enviado." };
  await createAdminClient().from("consultorias").update({ status: "nova" }).eq("id", consultoriaId).eq("status", "aguardando_briefing");
  revalidatePath("/consultoria");
  return { ok: true, mensagem: "Recebemos seu briefing. O consultor entra em contato pelo canal que você deixou." };
}

/** Consultor atualiza o andamento da consultoria. */
export async function atualizarConsultoria(id: string, dados: { status: "nova" | "em_andamento" | "entregue"; notas: string }): Promise<Resultado> {
  await exigirAdmin();
  if (!["nova", "em_andamento", "entregue"].includes(dados.status)) return { ok: false, mensagem: "Status inválido." };
  const { error } = await createAdminClient()
    .from("consultorias")
    .update({ status: dados.status, notas: dados.notas.slice(0, 4000) })
    .eq("id", id);
  if (error) return { ok: false, mensagem: "Não foi possível salvar." };
  revalidatePath("/admin/consultorias");
  return { ok: true, mensagem: "Salvo." };
}

/**
 * Reembolso pedido pelo cliente, feito pelo admin: só compra avulsa paga há no máximo N dias
 * (config `reembolso_dias`) e com o crédito ainda sem uso.
 */
export async function reembolsarPedido(pedidoId: string): Promise<Resultado> {
  await exigirAdmin();
  const db = createAdminClient();
  const { data: pedido } = await db.from("pedidos").select("*").eq("id", pedidoId).maybeSingle();
  if (!pedido || pedido.status !== "pago" || !pedido.provedor_id) return { ok: false, mensagem: "Só pedidos pagos podem ser reembolsados." };
  if (pedido.produto === "basic" || pedido.produto === "premium") return { ok: false, mensagem: "Assinaturas são canceladas no Mercado Pago." };

  const dias = Number(await lerConfig(db, "reembolso_dias", 7));
  const pagoHa = (Date.now() - new Date(pedido.pago_em ?? pedido.created_at).getTime()) / 86_400_000;
  if (pagoHa > dias) return { ok: false, mensagem: `Passou o prazo de ${dias} dias.` };
  const { data: lotes } = await db.from("creditos").select("id").eq("pedido_id", pedidoId).gt("quantidade", 0);
  const { data: saldo } = await db.from("creditos_lotes").select("restante").in("id", (lotes ?? []).map((l) => l.id));
  if (!saldo?.length || saldo.some((l) => (l.restante ?? 0) < 1)) return { ok: false, mensagem: "O crédito deste pedido já foi usado." };

  try {
    await reembolsar(pedido.provedor_id, `reembolso-${pedidoId}`);
  } catch (e) {
    const msg = e instanceof MercadoPagoError ? e.message : "O Mercado Pago não respondeu.";
    return { ok: false, mensagem: msg };
  }
  await estornarPedido(db, pedidoId);
  revalidatePath("/admin/pedidos");
  return { ok: true, mensagem: "Reembolso feito." };
}
