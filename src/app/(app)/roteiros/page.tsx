import { CalendarDays, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { FotoDestino } from "@/components/ui/foto";
import { buscarFoto } from "@/lib/images/fotos";
import { consultaDaParada, pontoDeCapa } from "@/lib/itinerary/fotos";
import { nomeCurto } from "@/lib/itinerary/map";
import { createClient } from "@/lib/supabase/server";
import { ItinerarySchema } from "@/lib/validation/itinerary";

export const metadata: Metadata = { title: "Meus roteiros — Compass" };

const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });

export default async function RoteirosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/roteiros");

  const { data } = await supabase
    .from("generated_itineraries")
    .select("id, title, itinerary, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const validos = (data ?? []).flatMap((r) => {
    const it = ItinerarySchema.safeParse(r.itinerary);
    return it.success ? [{ ...r, roteiro: it.data }] : [];
  });
  // Capa = foto do auge (Unsplash/Pexels, em cache no servidor); sem chave, cor + emoji.
  const capas = await Promise.all(
    validos.map((r) => buscarFoto(consultaDaParada(pontoDeCapa(r.roteiro).nome_local), { idioma: "pt-BR", orientacao: "landscape" })),
  );
  const roteiros = validos.map((r, i) => {
    const pontos = r.roteiro.pontos_mapa;
    const capa = pontoDeCapa(r.roteiro);
    return {
      id: r.id,
      titulo: r.title,
      criadoEm: dataCurta.format(new Date(r.created_at)),
      dias: r.roteiro.resumo_estrategico.total_dias_viagem,
      paradas: pontos.length,
      rota: pontos.map((p) => nomeCurto(p.nome_local)).join(" → "),
      capa: { foto: capas[i], emoji: capa.emoji, nome: nomeCurto(capa.nome_local) },
    };
  });

  return (
    <>
    <AppHeader />
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Meus roteiros</h1>
        <Link
          href="/nova-viagem"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          Nova viagem
        </Link>
      </header>

      {roteiros.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
          <MapPin className="size-6 text-accent-strong" aria-hidden />
          <p className="font-medium">Você ainda não tem roteiros.</p>
          <p className="text-sm text-text-2">
            Responda o questionário e receba sua rota no mapa. Quer ver antes como fica?{" "}
            <Link href="/exemplo" className="text-accent-strong underline">
              Abra o exemplo
            </Link>
            .
          </p>
        </section>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roteiros.map((r) => (
            <li key={r.id}>
              <Link
                href={`/roteiros/${r.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-text-3 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <FotoDestino
                  foto={r.capa.foto}
                  emoji={r.capa.emoji}
                  corReserva="#1f6f5c"
                  className="aspect-[16/10]"
                  imgClassName="transition-transform duration-500 group-hover:scale-105"
                >
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[#13140f]">
                    {r.capa.emoji} {r.capa.nome}
                  </span>
                </FotoDestino>
                <span className="flex flex-1 flex-col gap-1.5 p-4">
                  <span className="font-semibold text-balance">{r.titulo}</span>
                  <span className="line-clamp-2 text-sm text-text-2">{r.rota}</span>
                  <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-text-3">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {r.dias} dias
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {r.paradas} paradas
                    </span>
                    <span>Criado em {r.criadoEm}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
    </>
  );
}
