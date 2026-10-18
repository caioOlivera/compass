import type { Metadata, Viewport } from "next";
import "./globals.css";

// viewport-fit=cover: as barras fixas usam env(safe-area-inset-*) no iPhone
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f6f5c",
};

export const metadata: Metadata = {
  title: "Compass: roteiros de viagem fluidos",
  description: "Roteiros de viagem sem bate-e-volta, montados por IA e mostrados num mapa interativo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
