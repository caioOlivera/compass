import { CalendarDays, Check, Sun } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdaptarAssinado } from "@/components/assinado/adaptar-assinado";
import { Rodape } from "@/components/landing/fechamento";
import { SiteHeader } from "@/components/landing/site-header";
import { FotoDestino } from "@/components/ui/foto";
import { nomePais } from "@/lib/conhecimento/registros";
import { buscarFotos } from "@/lib/images/fotos";
import { catalogoAssinados, formatarPreco, precoAssinado } from "@/lib/motor/catalogo";

export const metadata: Metadata = { title: "Roteiro assinado — Compass" };
export const revalidate = 300;

export default async function RoteiroAssinadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [itens, preco] = await Promise.all([catalogoAssinados(), precoAssinado()]);
  const r = itens.find((i) => i.id === id);
  if (!r) notFound();
  const fotos = await buscarFotos(r.cidades.slice(0, 4), { idioma: "pt-BR" });

  return (
    <div className="bg-bg text-text">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
        <div className="grid h-64 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:h-80">
          {r.cidades.slice(0, 4).map((c, i) => (
            <FotoDestino
              key={c}
              foto={fotos[i]}
              tamanho={i === 0 ? "grande" : "media"}
              emoji="📍"
              corReserva="#1f6f5c"
              className={i === 0 ? "col-span-2 row-span-2" : i === 3 ? "col-span-2" : ""}
            >
              <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[#13140f]">{c}</span>
            </FotoDestino>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
              <p className="text-sm font-medium text-accent-strong">
                Roteiro assinado · {r.paises.map(nomePais).join(" · ")}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-balance">{r.titulo}</h1>
              <p className="flex flex-wrap gap-x-5 gap-y-1 text-text-2">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden /> {r.duracao_dias} dias
                </span>
                {r.epoca && (
                  <span className="inline-flex items-center gap-1.5">
                    <Sun className="size-4" aria-hidden /> {r.epoca}
                  </span>
                )}
              </p>
              <p className="text-lg text-text-2">{r.resumo}</p>
            </header>

            {r.essencia.length > 0 && (
              <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
                <h2 className="font-semibold">O que faz este roteiro ser o que é</h2>
                <ul className="flex flex-col gap-2">
                  {r.essencia.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-text-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
                      {e}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <h2 className="font-semibold">A rota</h2>
              <ol className="flex flex-wrap items-center gap-2 text-sm">
                {r.cidades.map((c, i) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-surface px-3 py-1">{c}</span>
                    {i < r.cidades.length - 1 && <span className="text-text-3">→</span>}
                  </li>
                ))}
              </ol>
              <p className="text-sm text-text-2">
                Depois da adaptação você recebe o mapa, o plano de cada dia, o checklist por cidade, os trechos e o PDF.
              </p>
            </section>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <AdaptarAssinado id={r.id} preco={formatarPreco(preco)} duracao={r.duracao_dias} />
          </aside>
        </div>
      </main>
      <Rodape creditos={fotos.filter((f) => f !== null)} />
    </div>
  );
}
