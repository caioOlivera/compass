import { roteiroPRD } from "@/lib/itinerary/exemplo";
import { respostaPdf } from "@/lib/pdf/resposta";

// PDF do roteiro de exemplo (público, sem checklist marcado).
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  return respostaPdf(roteiroPRD(), {}, "publico");
}
