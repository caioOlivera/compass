import { NextResponse } from "next/server";

// Passo 4: valida o payload do wizard com Zod, chama o Claude com o system prompt
// de src/lib/ai/prompts/itinerary-system.ts e grava o resultado em generated_itineraries.
export async function POST() {
  return NextResponse.json({ error: "Ainda não implementado" }, { status: 501 });
}
