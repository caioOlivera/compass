import { CalendarDays, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Rodape } from "@/components/landing/fechamento";
import { SiteHeader } from "@/components/landing/site-header";
import { FotoDestino } from "@/components/ui/foto";
import { nomePais } from "@/lib/conhecimento/registros";
import { buscarFoto } from "@/lib/images/fotos";
import { catalogoAssinados, formatarPreco, precoAssinado } from "@/lib/motor/catalogo";

export const metadata: Metadata = {
  title: "Roteiros assinados — Compass",
  description: "Roteiros que o consultor da Compass já fez e validou, adaptados às suas datas e ao seu jeito de viajar.",
};

export const revalidate = 300;

export default async function RoteirosAssinadosPage() {
  const [itens, preco] = await Promise.all([catalogoAssinados(), precoAssinado()]);
  const fotos = await Promise.all(itens.map((i) => buscarFoto(i.cidades[Math.min(1, i.cidades.length - 1)] ?? i.titulo, { idioma: "pt-BR" })));

  return (
    <div className="bg-bg text-text">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
        <header className="flex max-w-3xl flex-col gap-3">
          <p className="text-sm font-medium text-accent-strong">Roteiros assinados · {formatarPreco(preco)}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Roteiros que já foram feitos, adaptados a você</h1>
          <p className="text-lg text-text-2">
            Cada um foi percorrido e validado pelo consultor da Compass. A sequência, os trechos e o que faz a viagem valer a pena
            ficam; datas, época do ano, ritmo e quem vai junto são ajustados para você.
          </p>
        </header>

        {itens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-text-2">
            Os primeiros roteiros assinados estão sendo revisados. Enquanto isso,{" "}
            <Link href="/nova-viagem" className="text-accent-strong underline">
              monte um roteiro do zero
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {itens.map((r, i) => (
              <li key={r.id}>
                <Link
                  href={`/roteiros-assinados/${r.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-text-3 hover:shadow-md"
                >
                  <FotoDestino foto={fotos[i]} emoji="🧭" corReserva="#1f6f5c" className="aspect-[16/9]" imgClassName="transition-transform duration-500 group-hover:scale-105">
                    <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[#13140f]">
                      {r.paises.map(nomePais).join(" · ")}
                    </span>
                  </FotoDestino>
                  <span className="flex flex-1 flex-col gap-2 p-5">
                    <span className="text-xl font-semibold text-balance">{r.titulo}</span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-2">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden /> {r.duracao_dias} dias
                      </span>
                      {r.epoca && <span>Melhor em: {r.epoca}</span>}
                    </span>
                    <span className="inline-flex items-start gap-1.5 text-sm text-text-2">
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {r.cidades.join(" → ")}
                    </span>
                    <span className="line-clamp-3 text-sm text-text-2">{r.resumo}</span>
                    <span className="mt-auto pt-2 text-sm font-medium text-accent-strong">Ver roteiro e adaptar →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Rodape creditos={fotos.filter((f) => f !== null)} />
    </div>
  );
}
