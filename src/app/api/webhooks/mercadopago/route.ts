import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { processarAssinatura, processarCobrancaMensal, processarPagamento } from "@/lib/pagamentos/processar";
import { assinaturaValida } from "@/lib/pagamentos/webhook-assinatura";
import { createAdminClient } from "@/lib/supabase/admin";

// Avisos do Mercado Pago. Responde 200 rápido quando já processou ou quando o aviso não interessa;
// responde 500 em erro para o Mercado Pago tentar de novo.

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const segredo = serverEnv().MP_WEBHOOK_SECRET;
  if (!segredo) return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });

  const corpo = (await request.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const url = request.nextUrl;
  const tipo = corpo.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  const dataId = String(corpo.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (!dataId) return NextResponse.json({ ok: true });

  const valida = assinaturaValida({
    segredo,
    cabecalho: request.headers.get("x-signature") ?? "",
    requestId: request.headers.get("x-request-id") ?? "",
    dataId: url.searchParams.get("data.id") ?? dataId,
    toleranciaMs: 15 * 60_000,
  });
  if (!valida) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });

  const db = createAdminClient();
  try {
    if (tipo === "payment") await processarPagamento(db, dataId);
    else if (tipo === "subscription_preapproval") await processarAssinatura(db, dataId);
    else if (tipo === "subscription_authorized_payment") await processarCobrancaMensal(db, dataId);
  } catch (e) {
    console.error("webhook mercadopago", tipo, dataId, e);
    return NextResponse.json({ error: "Falhou; tente de novo" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
