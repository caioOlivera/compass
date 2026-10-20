import { NextResponse, type NextRequest } from "next/server";
import { lerConfig } from "@/lib/configuracoes";
import { limparPrazosVencidos } from "@/lib/lgpd";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { ItinerarySchema } from "@/lib/validation/itinerary";
import { fromTripRequestRow } from "@/lib/validation/trip-request";
import { completarRoteiro } from "@/lib/viagem/completo";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/cotacoes — chamado pela Vercel 1 vez ao dia (vercel.json).
 * Atualiza passagens e hotéis da versão mais recente de cada consulta completa feita nos últimos
 * N dias (config `atualizacao_completo`). O cache das cotações evita pagar duas vezes pela mesma busca.
 * No fim, apaga o que passou do prazo de guarda (LGPD).
 */
export async function GET(req: NextRequest) {
  const segredo = serverEnv().CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const db = createAdminClient();
  const { dias } = await lerConfig<{ dias: number }>(db, "atualizacao_completo", { dias: 15 });
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();

  const { data: consultas } = await db
    .from("trip_requests")
    .select("*")
    .eq("product", "completo")
    .eq("status", "completed")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(200);

  let atualizados = 0;
  const inicio = Date.now();
  for (const tr of consultas ?? []) {
    // Folga para não estourar o tempo da função; o resto fica para amanhã
    if (Date.now() - inicio > 240_000) break;
    const { data: versao } = await db
      .from("generated_itineraries")
      .select("id, itinerary")
      .eq("trip_request_id", tr.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!versao) continue;
    const roteiro = ItinerarySchema.safeParse(versao.itinerary);
    if (!roteiro.success) continue;
    try {
      const ok = await completarRoteiro(db, {
        itineraryId: versao.id,
        roteiro: roteiro.data,
        input: fromTripRequestRow(tr),
        userId: tr.user_id,
        tripRequestId: tr.id,
      });
      if (ok) atualizados++;
    } catch (e) {
      console.error("[cron cotacoes]", tr.id, e);
    }
  }
  // Prazos de guarda da Política de Privacidade
  await limparPrazosVencidos(db).catch((e) => console.error("[cron limpeza]", e));
  return NextResponse.json({ consultas: consultas?.length ?? 0, atualizados });
}
