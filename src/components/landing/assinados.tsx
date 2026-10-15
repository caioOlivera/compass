import { ArrowRight, BadgeCheck, CalendarDays } from "lucide-react";
import Link from "next/link";
import { FotoDestino } from "@/components/ui/foto";
import type { Foto } from "@/lib/images/fotos";
import type { ItemCatalogo } from "@/lib/motor/catalogo";

/** Vitrine dos roteiros assinados na landing; some se ainda não houver nenhum aprovado. */
export function Assinados({ itens, fotos, preco }: { itens: ItemCatalogo[]; fotos: (Foto | null)[]; preco: string }) {
  if (!itens.length) return null;
  return (
    <section id="assinados" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong">
            <BadgeCheck className="size-4" aria-hidden /> Roteiros assinados · {preco}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Viagens que já deram certo</h2>
          <p className="text-text-2">Roteiros feitos e validados pelo consultor, adaptados às suas datas e ao seu ritmo.</p>
        </div>
        <Link href="/roteiros-assinados" className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:underline">
          Ver todos <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="grid gap-5 md:grid-cols-3">
        {itens.slice(0, 3).map((r, i) => (
          <li key={r.id}>
            <Link href={`/roteiros-assinados/${r.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-text-3">
              <FotoDestino foto={fotos[i]} emoji="🧭" corReserva="#1f6f5c" className="aspect-[4/3]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
              <span className="flex flex-col gap-1 p-4">
                <span className="font-semibold text-balance">{r.titulo}</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-text-2">
                  <CalendarDays className="size-4" aria-hidden /> {r.duracao_dias} dias · {r.cidades.slice(0, 4).join(", ")}
                  {r.cidades.length > 4 ? "…" : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
