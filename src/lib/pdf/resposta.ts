import "server-only";
import { fotosParaPdf } from "@/lib/pdf/fotos-pdf";
import { nomeArquivoPdf } from "@/lib/pdf/layout";
import { gerarPdfRoteiro } from "@/lib/pdf/roteiro-pdf";
import type { ChecklistState, Itinerary } from "@/lib/validation/itinerary";

/** Monta o PDF (com fotos quando der) e devolve como download. */
export async function respostaPdf(roteiro: Itinerary, checklist: ChecklistState, cache: "privado" | "publico") {
  const { capa, miniaturas } = await fotosParaPdf(roteiro);
  const pdf = await gerarPdfRoteiro({ roteiro, checklist, capa, miniaturas });
  const nome = nomeArquivoPdf(roteiro.titulo);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": cache === "privado" ? "private, no-store" : "public, max-age=3600",
    },
  });
}
