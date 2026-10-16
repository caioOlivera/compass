import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { FAQ_LANDING as FAQ } from "@/lib/faq";

export function Faq() {
  return (
    <section id="perguntas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
          <p className="text-text-2">O que costumam perguntar antes do primeiro roteiro.</p>
          <Link href="/faq" className="mt-2 text-sm font-medium text-accent-strong hover:underline">
            Ver todas as perguntas →
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.p} className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-bg">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {f.p}
                <ChevronDown className="size-5 shrink-0 text-text-2 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-text-2">{f.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
