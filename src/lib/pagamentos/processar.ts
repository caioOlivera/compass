import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { creditarMensalidade, estornarPedido, liberarPedido, somarMeses } from "@/lib/creditos";
import type { Database } from "@/types/database";
import { buscarAssinaturaMP, buscarPagamento, buscarPagamentoAutorizado, type Pagamento } from "./mercadopago";

// O que fazer com cada aviso do Mercado Pago. Nunca confiamos no corpo do aviso: buscamos o
// pagamento ou a assinatura na API e agimos pelo estado de lá. Repetir um aviso não muda nada.

type Db = SupabaseClient<Database>;

const METODO: Record<string, string> = { bank_transfer: "pix", account_money: "saldo_mp", credit_card: "cartao", debit_card: "debito" };

/** Aplica o estado de um pagamento avulso ao pedido (external_reference = id do pedido). */
export async function aplicarPagamento(db: Db, pagamento: Pagamento): Promise<"pago" | "estornado" | "cancelado" | "ignorado"> {
  const pedidoId = pagamento.external_reference;
  if (!pedidoId) return "ignorado";
  const { data: pedido } = await db.from("pedidos").select("id, valor, status").eq("id", pedidoId).maybeSingle();
  if (!pedido) return "ignorado";

  if (pagamento.status === "approved") {
    // Valor diferente do pedido: não libera (alguém mexeu no checkout)
    if (Math.abs(Number(pagamento.transaction_amount) - Number(pedido.valor)) > 0.009) return "ignorado";
    const metodo = METODO[pagamento.payment_type_id ?? ""] ?? pagamento.payment_method_id ?? undefined;
    await liberarPedido(db, pedido.id, { provedorId: String(pagamento.id), metodo });
    return "pago";
  }
  if (pagamento.status === "refunded" || pagamento.status === "charged_back") {
    await estornarPedido(db, pedido.id);
    return "estornado";
  }
  if (pagamento.status === "rejected" || pagamento.status === "cancelled") {
    await db.from("pedidos").update({ status: "cancelado" }).eq("id", pedido.id).eq("status", "pendente");
    return "cancelado";
  }
  return "ignorado";
}

export async function processarPagamento(db: Db, pagamentoId: string) {
  return aplicarPagamento(db, await buscarPagamento(pagamentoId));
}

const STATUS_ASSINATURA = { pending: "pendente", authorized: "ativa", paused: "pausada", cancelled: "cancelada" } as const;

/** Mudou o estado da assinatura (autorizada, pausada, cancelada). */
export async function processarAssinatura(db: Db, preapprovalId: string) {
  const mp = await buscarAssinaturaMP(preapprovalId);
  if (!mp.external_reference) return;
  const status = STATUS_ASSINATURA[mp.status] ?? "pendente";
  const { data: assinatura } = await db
    .from("assinaturas")
    .update({ status, provedor_id: mp.id })
    .eq("id", mp.external_reference)
    .select("id, organizacao_id, plano")
    .maybeSingle();
  if (!assinatura) return;
  if (status === "cancelada" || status === "pausada") {
    // Mantém o que já foi pago até o fim do período; só não renova
    return;
  }
  if (status === "ativa") {
    await db.from("organizacoes").update({ plano: assinatura.plano }).eq("id", assinatura.organizacao_id);
  }
}

/** Cobrança mensal da assinatura: aprovada → estende o plano um mês e, no Basic, entrega os créditos do mês. */
export async function processarCobrancaMensal(db: Db, autorizadoId: string) {
  const cobranca = await buscarPagamentoAutorizado(autorizadoId);
  const aprovada = cobranca.payment?.status === "approved" || cobranca.status === "processed" || cobranca.status === "approved";
  if (!aprovada) return;
  // Cada cobrança só conta uma vez, mesmo que o aviso chegue de novo
  const { error } = await db.from("webhooks_recebidos").insert({ chave: `cobranca:${cobranca.id}` });
  if (error) return;

  const { data: assinatura } = await db
    .from("assinaturas")
    .select("id, organizacao_id, plano, atual_ate")
    .eq("provedor_id", cobranca.preapproval_id)
    .maybeSingle();
  if (!assinatura) return;

  const agora = new Date();
  const base = assinatura.atual_ate && new Date(assinatura.atual_ate) > agora ? new Date(assinatura.atual_ate) : agora;
  const ate = somarMeses(base, 1);
  await db.from("assinaturas").update({ status: "ativa", atual_ate: ate.toISOString() }).eq("id", assinatura.id);
  await db.from("organizacoes").update({ plano: assinatura.plano, plano_ativo_ate: ate.toISOString() }).eq("id", assinatura.organizacao_id);
  // Basic: créditos do mês valem até o fim do período e não acumulam
  if (assinatura.plano === "basic") await creditarMensalidade(db, assinatura.organizacao_id, ate);
}
