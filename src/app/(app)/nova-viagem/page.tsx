import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Wizard } from "@/components/wizard/wizard";

export const metadata: Metadata = { title: "Nova viagem — Compass" };

// Acesso protegido pelo proxy.ts; a API confere a sessão de novo ao gerar.
export default function NovaViagemPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <Wizard />
      </main>
    </>
  );
}
