import type { Metadata } from "next";
import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { buscarFoto } from "@/lib/images/pexels";
import { fotosDoRoteiro } from "@/lib/itinerary/fotos";
import { roteiroPRD } from "@/lib/itinerary/exemplo";

export const metadata: Metadata = {
  title: "Exemplo de roteiro — Compass",
  description: "Roma às Dolomitas em 15 dias: um roteiro fluido de exemplo no mapa interativo.",
};

// Demonstração pública: roteiro fixo, checklist só no navegador.
export default async function ExemploPage() {
  const roteiro = roteiroPRD();
  const fotos = await fotosDoRoteiro(roteiro, (q) => buscarFoto(q, { idioma: "pt-BR" }));
  return <ItineraryView roteiro={roteiro} fotos={fotos} checklistInicial={{}} voltar={{ href: "/", rotulo: "Início" }} pdfHref="/exemplo/pdf" />;
}
