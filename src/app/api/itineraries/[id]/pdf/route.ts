import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { marcaDaAgencia, respostaPdf } from "@/lib/pdf/resposta";
import { createClient } from "@/lib/supabase/server";
import { lerExtras } from "@/lib/viagem/completo-plano";
import { ChecklistStateSchema, ItinerarySchema } from "@/lib/validation/itinerary";

// PDF do roteiro, com o checklist marcado como está. A RLS garante que só o dono baixa.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return naoEncontrado();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entre para baixar o roteiro." }, { status: 401 });

  const { data } = await supabase
    .from("generated_itineraries")
    .select("itinerary, checklist_state, extras")
    .eq("id", id)
    .maybeSingle();
  if (!data) return naoEncontrado();

  const roteiro = ItinerarySchema.safeParse(data.itinerary);
  if (!roteiro.success) return NextResponse.json({ error: "Roteiro inválido." }, { status: 500 });
  return respostaPdf(roteiro.data, ChecklistStateSchema.catch({}).parse(data.checklist_state), "privado", await marcaDaAgencia(supabase), lerExtras(data.extras));
}

function naoEncontrado() {
  return NextResponse.json({ error: "Roteiro não encontrado." }, { status: 404 });
}
