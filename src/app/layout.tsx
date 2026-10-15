import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compass — roteiros fluidos",
  description: "Roteiros de viagem sem bate-e-volta, montados por IA e mostrados num mapa interativo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
