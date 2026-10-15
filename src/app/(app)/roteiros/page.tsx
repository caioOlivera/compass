import { CalendarDays, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import { nomeCurto } from "@/lib/itinerary/map";
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

  const roteiros = (data ?? []).flatMap((r) => {
    const it = ItinerarySchema.safeParse(r.itinerary);
    if (!it.success) return [];
    const pontos = it.data.pontos_mapa;
    return [
      {
        id: r.id,
        titulo: r.title,
        criadoEm: dataCurta.format(new Date(r.created_at)),
        dias: it.data.resumo_estrategico.total_dias_viagem,
        rota: pontos.map((p) => `${p.emoji} ${nomeCurto(p.nome_local)}`).join(" → "),
      },
    ];
  });

  return (
    <>
    <AppHeader />
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
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
        <ul className="flex flex-col gap-3">
          {roteiros.map((r) => (
            <li key={r.id}>
              <Link
                href={`/roteiros/${r.id}`}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-5 transition hover:border-text-3"
              >
                <span className="font-semibold">{r.titulo}</span>
                <span className="truncate text-sm text-text-2">{r.rota}</span>
                <span className="flex gap-4 text-xs text-text-3">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {r.dias} dias
                  </span>
                  <span>Criado em {r.criadoEm}</span>
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
