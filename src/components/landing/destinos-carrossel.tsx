"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { DESTINOS_LANDING, linkQuestionario } from "@/components/landing/destinos";
import { FotoDestino } from "@/components/ui/foto";
import type { Foto } from "@/lib/images/pexels";

/** Carrossel de destinos: cada cartão abre o questionário com o destino como auge. */
export function DestinosCarrossel({ fotos }: { fotos: (Foto | null)[] }) {
  const lista = useRef<HTMLUListElement>(null);
  const rolar = (dir: 1 | -1) => lista.current?.scrollBy({ left: dir * lista.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="bg-surface py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Destinos que viram roteiro</h2>
            <p className="max-w-2xl text-text-2">Toque em um para começar com ele como o auge da viagem.</p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => rolar(-1)}
              aria-label="Destinos anteriores"
              className="rounded-full border border-border bg-bg p-2.5 transition hover:border-accent hover:text-accent-strong active:scale-95"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => rolar(1)}
              aria-label="Próximos destinos"
              className="rounded-full border border-border bg-bg p-2.5 transition hover:border-accent hover:text-accent-strong active:scale-95"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={lista}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
      >
        {DESTINOS_LANDING.map((d, i) => (
          <li key={d.nome} className="w-[260px] shrink-0 snap-start sm:w-[300px]">
            <Link href={linkQuestionario(d.nome, d.regiao)} className="group block overflow-hidden rounded-2xl">
              <FotoDestino
                foto={fotos[i]}
                tamanho="retrato"
                emoji={d.emoji}
                corReserva="#3b5f5a"
                className="aspect-[3/4]"
                imgClassName="transition-transform duration-500 group-hover:scale-105"
              >
                <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[#13140f]">
                  {d.regiaoNome}
                </span>
                <div className="absolute inset-x-0 bottom-0 bg-black/50 px-4 py-3 text-white">
                  <p className="text-xl font-semibold">
                    <span aria-hidden>{d.emoji}</span> {d.nome}
                  </p>
                  <p className="text-sm text-white/85">{d.ideia}</p>
                </div>
              </FotoDestino>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
