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
          <p className="text-text-2">
            Viagens feitas de verdade por quem já rodou 4 continentes, 14 países e mais de 70 cidades. Você escolhe as datas e o
            ritmo; a rota já foi testada.
          </p>
        </div>
        <Link href="/roteiros-assinados" className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:underline">
          Ver todos <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="grid gap-5 md:grid-cols-3">
        {itens.slice(0, 3).map((r, i) => (
          <li key={r.id} className="flex">
            <Link
              href={`/roteiros-assinados/${r.id}`}
              className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-text-3"
            >
              <FotoDestino foto={fotos[i]} emoji="🧭" corReserva="#1f6f5c" className="aspect-[4/3] shrink-0" imgClassName="transition-transform duration-500 group-hover:scale-105" />
              <span className="flex flex-1 flex-col gap-2 p-4">
                <span className="line-clamp-2 min-h-[3rem] font-semibold text-balance">{r.titulo}</span>
                <span className="inline-flex items-start gap-1.5 text-sm text-text-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="line-clamp-1">
                    {r.duracao_dias} dias · {r.cidades.join(", ")}
                  </span>
                </span>
                <span className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
                  <span className="flex flex-col">
                    <span className="text-xs text-text-2">Adaptado às suas datas</span>
                    <span className="text-2xl font-semibold tabular-nums">{preco}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong group-hover:underline">
                    Ver roteiro <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
