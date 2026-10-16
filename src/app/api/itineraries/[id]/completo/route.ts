import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cobrancaAtiva, exigirCredito } from "@/lib/creditos";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ItinerarySchema } from "@/lib/validation/itinerary";
import { fromTripRequestRow } from "@/lib/validation/trip-request";
import { montarExtras } from "@/lib/viagem/completo";
import { lerExtras } from "@/lib/viagem/completo-plano";
import type { Json } from "@/types/database";

export const maxDuration = 120;

/**
 * POST /api/itineraries/[id]/completo  { atualizar?: boolean }
 * Produto completo: cota passagens e 2–3 hotéis por cidade e guarda junto da versão do roteiro.
 * Já pago quando a consulta usou um crédito "completo"; senão consome um (com a cobrança ligada).
 * Atualizar os preços de um roteiro já completo não cobra de novo (uma vez a cada 12 h).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return erro(404, "Roteiro não encontrado.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro(401, "Entre para continuar.");
  const corpo = (await req.json().catch(() => ({}))) as { atualizar?: boolean };

  // RLS: só o dono lê
  const { data: atual } = await supabase.from("generated_itineraries").select("id, itinerary, extras, trip_request_id, trip_requests(*)").eq("id", id).maybeSingle();
  if (!atual?.trip_requests) return erro(404, "Roteiro não encontrado.");

  const anteriores = lerExtras(atual.extras);
  if (anteriores && !corpo.atualizar) return NextResponse.json({ extras: anteriores });
  if (anteriores && Date.now() - new Date(anteriores.gerado_em).getTime() < 12 * 3_600_000) {
    return erro(429, "Os preços foram consultados há pouco. Tente atualizar mais tarde.");
  }

  const admin = createAdminClient();
  const tr = atual.trip_requests;
  if (!anteriores) {
    const { count: pagoComCompleto } = await admin
      .from("creditos")
      .select("id", { count: "exact", head: true })
      .eq("trip_request_id", tr.id)
      .eq("tipo", "completo")
      .lt("quantidade", 0);
    const jaPago = tr.product === "completo" || (pagoComCompleto ?? 0) > 0;
    if (!jaPago) {
      if (await cobrancaAtiva(admin)) {
        const credito = await exigirCredito(admin, { userId: user.id, produto: "completo", tripRequestId: tr.id });
        if (!credito.ok) return NextResponse.json({ error: credito.mensagem, comprar: credito.comprar }, { status: credito.status });
      } else {
        // Grátis no lançamento: o limite diário vale também aqui (cada uso chama APIs pagas)
        const desde = new Date(Date.now() - 86_400_000).toISOString();
        const { data: usos } = await admin
          .from("eventos_uso")
          .select("trip_request_id")
          .eq("user_id", user.id)
          .in("tipo", ["busca_voo", "busca_hotel"])
          .gte("created_at", desde);
        const consultas = new Set((usos ?? []).map((u) => u.trip_request_id)).size;
        if (consultas >= serverEnv().DAILY_GENERATION_LIMIT) return erro(429, "Você atingiu o limite diário de cotações. Tente amanhã.");
      }
      await admin.from("trip_requests").update({ product: "completo" }).eq("id", tr.id);
    }
  }

  const roteiro = ItinerarySchema.parse(atual.itinerary);
  const pedido = fromTripRequestRow(tr);
  const extras = await montarExtras(
    admin,
    roteiro,
    {
      cidade_origem: pedido.cidade_origem,
      data_inicio: pedido.data_inicio,
      data_fim: pedido.data_fim,
      adultos: pedido.adultos ?? 2,
      criancas: pedido.criancas ?? 0,
      orcamento: pedido.orcamento ?? "medio",
    },
    { userId: user.id, tripRequestId: tr.id, itineraryId: id },
  );
  await admin.from("generated_itineraries").update({ extras: extras as unknown as Json }).eq("id", id);
  return NextResponse.json({ extras }, { status: 201 });
}

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}
