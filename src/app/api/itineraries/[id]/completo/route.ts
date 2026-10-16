import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ItinerarySchema } from "@/lib/validation/itinerary";
import { fromTripRequestRow } from "@/lib/validation/trip-request";
import { completarRoteiro } from "@/lib/viagem/completo";
import { lerExtras } from "@/lib/viagem/completo-plano";

export const maxDuration = 120;

/**
 * POST /api/itineraries/[id]/completo
 * Só para consultas completas cujas passagens e hotéis falharam na geração: tenta de novo, sem
 * cobrar. Não existe upgrade de roteiro para completo; quem quer passagens e hotéis gera um completo.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return erro(404, "Roteiro não encontrado.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro(401, "Entre para continuar.");

  // RLS: só o dono lê
  const { data: atual } = await supabase.from("generated_itineraries").select("id, itinerary, extras, trip_requests(*)").eq("id", id).maybeSingle();
  if (!atual?.trip_requests) return erro(404, "Roteiro não encontrado.");
  if (atual.trip_requests.product !== "completo") return erro(403, "Este roteiro não inclui passagens e hotéis.");
  const anteriores = lerExtras(atual.extras);
  if (anteriores) return NextResponse.json({ extras: anteriores });

  const ok = await completarRoteiro(createAdminClient(), {
    itineraryId: id,
    roteiro: ItinerarySchema.parse(atual.itinerary),
    input: fromTripRequestRow(atual.trip_requests),
    userId: user.id,
    tripRequestId: atual.trip_requests.id,
  });
  return ok ? NextResponse.json({ ok: true }, { status: 201 }) : erro(503, "Não conseguimos consultar os preços agora. Tente em alguns minutos.");
}

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}
