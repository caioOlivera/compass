import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Rodape } from "@/components/landing/fechamento";
import { SiteHeader } from "@/components/landing/site-header";
import { FAQ_COMPLETO } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Perguntas frequentes — Compass",
  description: "Como funcionam os roteiros, os produtos, o pagamento, o reembolso e o suporte da Compass.",
};

export default function FaqPage() {
  return (
    <div className="bg-bg text-text">
      <SiteHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-14 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Perguntas frequentes</h1>
          <p className="text-text-2">
            Não achou o que procurava?{" "}
            <Link href="/ajuda" className="font-medium text-accent-strong hover:underline">
              Fale com a gente
            </Link>
            .
          </p>
          <nav aria-label="Assuntos" className="flex flex-wrap gap-2 text-sm">
            {FAQ_COMPLETO.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="rounded-full border border-border px-3 py-1.5 text-text-2 hover:text-text">
                {g.titulo}
              </a>
            ))}
          </nav>
        </header>
        {FAQ_COMPLETO.map((g) => (
          <section key={g.id} id={g.id} className="flex scroll-mt-20 flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">{g.titulo}</h2>
            {g.itens.map((f) => (
              <details key={f.p} className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-bg">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.p}
                  <ChevronDown className="size-5 shrink-0 text-text-2 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 text-text-2">{f.r}</p>
              </details>
            ))}
          </section>
        ))}
      </main>
      <Rodape creditos={[]} />
    </div>
  );
}
