import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Compass: roteiros de viagem sem volta",
  description:
    "Roteiros que entram por uma cidade e saem por outra. Responda sete perguntas e receba a rota no mapa, com os dias de cada parada, os trechos e o checklist.",
};

export default function Home() {
  return <Landing />;
}
