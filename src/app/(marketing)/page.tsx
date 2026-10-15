import Link from "next/link";
import { Map, Route, Timer } from "lucide-react";

const BENEFITS = [
  {
    icon: Route,
    title: "Sem bate-e-volta",
    text: "Entrada por um aeroporto, saída por outro. A rota segue uma linha contínua até o fim.",
  },
  {
    icon: Timer,
    title: "No seu ritmo",
    text: "Cidades e regiões de natureza têm tempos diferentes. O roteiro ajusta os dias de cada base.",
  },
  {
    icon: Map,
    title: "Tudo no mapa",
    text: "Cada parada com checklist de atrações e cada trecho com transporte e tempo estimado.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-24">
      <section className="flex flex-col gap-6">
        <p className="text-sm font-medium tracking-wide text-accent uppercase">Compass</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Diga onde é o auge da viagem. A gente desenha o caminho até lá.
        </h1>
        <p className="max-w-2xl text-lg text-text-2">
          Responda um questionário de 7 passos e receba um roteiro fluido, com voos open-jaw,
          bases bem escolhidas e o trajeto inteiro num mapa.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cadastro"
            className="rounded-lg bg-accent px-5 py-3 font-medium text-accent-contrast transition hover:opacity-90"
          >
            Criar meu roteiro
          </Link>
          <Link href="/login" className="rounded-lg border border-border px-5 py-3 font-medium hover:bg-surface-2">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <article key={title} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <Icon className="size-5 text-accent" aria-hidden />
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-text-2">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
