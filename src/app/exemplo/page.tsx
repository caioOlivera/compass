import type { Metadata } from "next";
import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { roteiroPRD } from "@/lib/itinerary/exemplo";

export const metadata: Metadata = {
  title: "Exemplo de roteiro — Compass",
  description: "Roma às Dolomitas em 15 dias: um roteiro fluido de exemplo no mapa interativo.",
};

// Demonstração pública: roteiro fixo, checklist só no navegador.
export default function ExemploPage() {
  return <ItineraryView roteiro={roteiroPRD()} checklistInicial={{}} voltar={{ href: "/", rotulo: "Início" }} />;
}
