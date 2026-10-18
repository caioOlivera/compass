"use client";

import { useEffect, useRef, useState } from "react";
import { ROTA } from "@/components/landing/data";
import { PacePicker } from "@/components/landing/pace-picker";
import { RoutePanel } from "@/components/landing/route-panel";
import type { Foto } from "@/lib/images/fotos";

/**
 * Como a rota é desenhada: o painel fixo mostra o exemplo (Roma → Milão) e acende uma parada a
 * cada bloco de texto lido. Antes do primeiro bloco, nada aceso.
 */
export function RouteStory({ fotos = [] }: { fotos?: (Foto | null)[] }) {
  const [ativa, setAtiva] = useState(-1);
  const blocos = useRef<(HTMLElement | null)[]>([]);
  const intro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setAtiva(Number((e.target as HTMLElement).dataset.parada));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    blocos.current.forEach((el) => el && obs.observe(el));
    if (intro.current) obs.observe(intro.current);
    return () => obs.disconnect();
  }, []);

  const registrar = (i: number) => (el: HTMLElement | null) => {
    blocos.current[i] = el;
  };

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <div ref={intro} data-parada={-1} className="mb-10 flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Uma linha só, de uma porta à outra</h2>
        <p className="max-w-2xl text-text-2">
          Veja como a Compass pensa um roteiro real: 15 dias saindo de São Paulo, com o auge nas Dolomitas.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        {/* No celular o painel também gruda no topo (menor), para a foto e a rota trocarem enquanto se lê */}
        <div className="sticky top-[68px] z-10 h-[38svh] lg:top-24 lg:h-[calc(100svh-8rem)]">
          <RoutePanel ativa={ativa} fotos={fotos} />
        </div>

        <div className="flex flex-col">
          <Bloco ref={registrar(0)} i={0} titulo="Entra por uma porta">
            <p>
              Você sai de São Paulo e pousa onde a viagem começa. Para quem quer as Dolomitas, isso é Roma: três dias de
              cidade antes de o trem seguir para o norte.
            </p>
            <p className="text-3xl font-semibold tracking-tight text-accent-strong tabular-nums">GRU → FCO</p>
          </Bloco>

          <Bloco ref={registrar(1)} i={1} titulo="Para no caminho, nunca fora dele">
            <p>
              Sobrou tempo? Entra uma base que já está na rota, como Florença entre Roma e as montanhas. Cada trecho vem
              com o meio de transporte e o tempo de porta a porta.
            </p>
            <dl className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-sm">
              {ROTA.slice(0, -1).map((p, i) => (
                <div key={p.id} className="flex flex-wrap justify-between gap-x-4">
                  <dt className="font-medium">
                    {p.nome} → {ROTA[i + 1].nome}
                  </dt>
                  <dd className="text-text-2 tabular-nums">
                    {p.trecho!.meio}, {p.trecho!.tempo}
                  </dd>
                </div>
              ))}
            </dl>
          </Bloco>

          <Bloco ref={registrar(2)} i={2} titulo="O auge fica com mais dias">
            <p>
              Os dias vão primeiro para o lugar que faz a viagem valer a pena, e o resto se encaixa em volta no ritmo que
              você escolher. Troque o ritmo e veja os mesmos 15 dias se reorganizarem.
            </p>
            <PacePicker />
          </Bloco>

          <Bloco ref={registrar(3)} i={3} titulo="Sai por outra">
            <p>
              O carro fica em Malpensa e o voo de volta parte dali, de Milão para São Paulo. Ninguém refaz quase 600 km
              até Roma só para pegar o avião onde chegou.
            </p>
            <p className="rounded-xl bg-accent/10 p-5 text-lg font-medium text-accent-strong">
              Uma linha só, do primeiro ao último dia. Nenhum trecho repetido.
            </p>
          </Bloco>
        </div>
      </div>
    </section>
  );
}

function Bloco({
  ref,
  i,
  titulo,
  children,
}: {
  ref: React.Ref<HTMLElement>;
  i: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <article
      ref={ref}
      data-parada={i}
      aria-label={`${ROTA[i].nome}: ${titulo}`}
      className="flex flex-col justify-center gap-4 py-10 text-text-2 max-lg:min-h-[55svh] lg:min-h-[70svh]"
    >
      <p className="text-sm font-medium text-accent-strong">
        {ROTA[i].nome} · {ROTA[i].papel}
      </p>
      <h3 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">{titulo}</h3>
      {children}
    </article>
  );
}
