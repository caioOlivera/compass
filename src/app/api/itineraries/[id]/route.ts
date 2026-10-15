import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ChecklistStateSchema } from "@/lib/validation/itinerary";

// Roteiros são lidos e editados com a sessão do usuário: a RLS só deixa ver os próprios
// e os grants de coluna só deixam mudar title e checklist_state.

const PatchSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    checklist_state: ChecklistStateSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.checklist_state !== undefined, "Nada para atualizar");

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Contexto) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return naoEncontrado();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_itineraries")
    .select("id, trip_request_id, version, title, itinerary, checklist_state, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Erro ao carregar o roteiro." }, { status: 500 });
  if (!data) return naoEncontrado();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Contexto) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return naoEncontrado();

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", detalhes: z.flattenError(parsed.error) }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_itineraries")
    .update(parsed.data)
    .eq("id", id)
    .select("id, title, checklist_state, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Erro ao salvar." }, { status: 500 });
  // Sem linha = não existe ou não é do usuário (a RLS esconde); nos dois casos, 404.
  if (!data) return naoEncontrado();
  return NextResponse.json(data);
}

function naoEncontrado() {
  return NextResponse.json({ error: "Roteiro não encontrado." }, { status: 404 });
}
