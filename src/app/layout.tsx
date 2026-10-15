import type { Metadata } from "next";
import "@fontsource-variable/inter-tight";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compass: roteiros de viagem sem volta",
  description: "Roteiros de viagem sem bate-e-volta, montados por IA e mostrados num mapa interativo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
