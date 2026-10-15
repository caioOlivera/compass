import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { linkQuestionario, REGIOES_LANDING } from "@/components/landing/destinos";
import { FotoDestino } from "@/components/ui/foto";
import type { Foto } from "@/lib/images/pexels";
import { cn } from "@/lib/utils";

/** Grade de regiões com foto: cada uma abre o questionário com a região escolhida. */
export function Regioes({ fotos }: { fotos: (Foto | null)[] }) {
  return (
    <section id="regioes" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Explore por região</h2>
        <p className="max-w-2xl text-text-2">
          O roteiro inteiro fica dentro da região que você escolher: entradas, bases e saídas. Escolha uma para começar.
        </p>
      </div>
      <ul className="grid auto-rows-[200px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4">
        {REGIOES_LANDING.map((r, i) => (
          <li key={r.id} className={cn(i === 0 && "col-span-2 row-span-2", i >= 9 && "lg:col-span-2")}>
            <Link
              href={linkQuestionario(undefined, r.id)}
              className="group block h-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <FotoDestino
                foto={fotos[i]}
                tamanho={i === 0 ? "grande" : "media"}
                emoji={r.emoji}
                corReserva={r.cor}
                className="h-full"
                imgClassName="transition-transform duration-500 group-hover:scale-105"
              >
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-black/45 px-4 py-3 text-white">
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("font-semibold", i === 0 ? "text-2xl" : "text-base")}>
                      <span aria-hidden>{r.emoji}</span> {r.nome}
                    </span>
                    <span className="truncate text-sm text-white/85">{r.destaques}</span>
                  </span>
                  <ArrowUpRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </div>
              </FotoDestino>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
