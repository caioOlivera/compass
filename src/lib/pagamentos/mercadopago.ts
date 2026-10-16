import "server-only";
import { serverEnv } from "@/lib/env";

// Cliente mínimo da API do Mercado Pago (REST com fetch). Checkout Pro para compras avulsas
// (Pix e cartão na mesma tela) e preapproval para as assinaturas das agências.

const BASE = "https://api.mercadopago.com";

export class MercadoPagoError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MercadoPagoError";
  }
}

export function mercadoPagoConfigurado(): boolean {
  return !!serverEnv().MP_ACCESS_TOKEN;
}

export function urlDoSite(): string {
  return (serverEnv().NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function chamar<T>(caminho: string, init: RequestInit & { idempotencia?: string } = {}): Promise<T> {
  const token = serverEnv().MP_ACCESS_TOKEN;
  if (!token) throw new MercadoPagoError(503, "Mercado Pago não configurado (MP_ACCESS_TOKEN).");
  const res = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.idempotencia ? { "X-Idempotency-Key": init.idempotencia } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new MercadoPagoError(res.status, `Mercado Pago ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  return (await res.json()) as T;
}

export type Preferencia = { id: string; init_point: string; sandbox_init_point?: string };

/** Checkout Pro: página do Mercado Pago com Pix e cartão. external_reference = id do pedido. */
export function criarPreferencia(p: { pedidoId: string; titulo: string; valor: number; email?: string }): Promise<Preferencia> {
  const site = urlDoSite();
  return chamar<Preferencia>("/checkout/preferences", {
    method: "POST",
    idempotencia: p.pedidoId,
    body: JSON.stringify({
      items: [{ id: p.pedidoId, title: p.titulo, quantity: 1, unit_price: p.valor, currency_id: "BRL" }],
      external_reference: p.pedidoId,
      payer: p.email ? { email: p.email } : undefined,
      notification_url: `${site}/api/webhooks/mercadopago`,
      back_urls: { success: `${site}/pedidos/${p.pedidoId}`, pending: `${site}/pedidos/${p.pedidoId}`, failure: `${site}/pedidos/${p.pedidoId}` },
      auto_return: "approved",
      payment_methods: { installments: 1 },
      statement_descriptor: "COMPASS",
    }),
  });
}

export type Pagamento = {
  id: number;
  status: "pending" | "approved" | "authorized" | "in_process" | "in_mediation" | "rejected" | "cancelled" | "refunded" | "charged_back";
  external_reference: string | null;
  transaction_amount: number;
  payment_method_id?: string;
  payment_type_id?: string;
  date_approved?: string | null;
};

export function buscarPagamento(id: string): Promise<Pagamento> {
  return chamar<Pagamento>(`/v1/payments/${encodeURIComponent(id)}`);
}

/** Estorno total. */
export function reembolsar(pagamentoId: string, chave: string): Promise<{ id: number; status: string }> {
  return chamar(`/v1/payments/${encodeURIComponent(pagamentoId)}/refunds`, { method: "POST", idempotencia: chave, body: "{}" });
}

export type Assinatura = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference: string | null;
  init_point?: string;
  next_payment_date?: string | null;
};

/** Assinatura mensal no cartão; o cliente autoriza no init_point. external_reference = id da assinatura local. */
export function criarAssinaturaMP(p: { assinaturaId: string; titulo: string; valor: number; email: string }): Promise<Assinatura> {
  return chamar<Assinatura>("/preapproval", {
    method: "POST",
    idempotencia: p.assinaturaId,
    body: JSON.stringify({
      reason: p.titulo,
      external_reference: p.assinaturaId,
      payer_email: p.email,
      back_url: `${urlDoSite()}/agencia`,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: p.valor, currency_id: "BRL" },
      status: "pending",
    }),
  });
}

export function buscarAssinaturaMP(id: string): Promise<Assinatura> {
  return chamar<Assinatura>(`/preapproval/${encodeURIComponent(id)}`);
}

export type PagamentoAutorizado = { id: number; preapproval_id: string; status: string; payment?: { id: number; status: string } };

export function buscarPagamentoAutorizado(id: string): Promise<PagamentoAutorizado> {
  return chamar<PagamentoAutorizado>(`/authorized_payments/${encodeURIComponent(id)}`);
}
