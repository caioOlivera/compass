"use client";

import { ArrowRight, Map, Route, Search, Timer } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { linkQuestionario, MOSAICO_HERO } from "@/components/landing/destinos";
import { FotoDestino } from "@/components/ui/foto";
import type { Foto } from "@/lib/images/fotos";

const POPULARES = [
  { nome: "Dolomitas", emoji: "🏔️", regiao: "europa" },
  { nome: "Patagônia", emoji: "🏔️", regiao: "america-do-sul" },
  { nome: "Tóquio", emoji: "🗼", regiao: "asia-leste" },
  { nome: "Ilhas Gregas", emoji: "🏝️", regiao: "europa" },
  { nome: "Capadócia", emoji: "🎈", regiao: "oriente-medio" },
];

const BENEFICIOS = [
  { icone: Route, titulo: "Sem bate-e-volta", texto: "Entra por uma cidade, sai por outra." },
  { icone: Timer, titulo: "No seu ritmo", texto: "Dias por parada conforme o destino." },
  { icone: Map, titulo: "Tudo no mapa", texto: "Checklist e trechos em cada parada." },
];

export function Hero({ fotos }: { fotos: (Foto | null)[] }) {
  const router = useRouter();
  const [auge, setAuge] = useState("");

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-20">
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">Para onde você quer ir?</h1>
        <p className="max-w-xl text-lg text-text-2">
          Diga o lugar que faz a viagem valer a pena. A Compass desenha a rota inteira: entra por uma cidade, sai por
          outra e nunca volta pelo mesmo caminho.
        </p>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(linkQuestionario(auge.trim() || undefined));
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-surface p-1.5 pl-5 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
        >
          <Search className="size-5 shrink-0 text-text-3" aria-hidden />
          <label htmlFor="busca-auge" className="sr-only">
            Qual é o auge da viagem?
          </label>
          <input
            id="busca-auge"
            value={auge}
            onChange={(e) => setAuge(e.target.value)}
            placeholder="Qual é o auge da viagem? Ex.: Dolomitas"
            className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-text-3"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 font-medium text-accent-contrast transition hover:opacity-90 active:scale-[0.97]"
          >
            <span className="hidden sm:inline">Montar roteiro</span>
            <ArrowRight className="size-4" aria-hidden />
            <span className="sr-only sm:hidden">Montar roteiro</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-2">Populares:</span>
          {POPULARES.map((d) => (
            <Link
              key={d.nome}
              href={linkQuestionario(d.nome, d.regiao)}
              className="rounded-full border border-border bg-surface px-3 py-1.5 transition hover:border-accent hover:text-accent-strong"
            >
              <span aria-hidden>{d.emoji}</span> {d.nome}
            </Link>
          ))}
        </div>

        <ul className="mt-2 grid gap-4 sm:grid-cols-3">
          {BENEFICIOS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-strong">
                <Icone className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{titulo}</span>
                <span className="text-sm text-text-2">{texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <div className="grid h-[420px] grid-cols-2 grid-rows-2 gap-3 sm:h-[520px]">
          {MOSAICO_HERO.map((m, i) => (
            <motion.div
              key={m.nome}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className={i === 0 ? "row-span-2" : ""}
            >
              <FotoDestino
                foto={fotos[i]}
                tamanho={i === 0 ? "retrato" : "media"}
                emoji={m.emoji}
                corReserva={["#3b5f7a", "#2f5a7a", "#7a3b3b"][i]}
                prioridade
                className="h-full rounded-2xl"
              >
                <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-[#13140f] shadow-sm">
                  <span aria-hidden>{m.emoji}</span> {m.nome}
                </span>
              </FotoDestino>
            </motion.div>
          ))}
        </div>

        {/* Um pedaço do produto sobre as fotos: a rota de exemplo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="absolute -bottom-6 left-4 w-[min(320px,85%)] rounded-2xl border border-border bg-surface p-4 shadow-lg sm:-left-6"
        >
          <p className="text-sm font-semibold">Itália de Roma às Dolomitas</p>
          <p className="text-xs text-text-2">15 dias · entra por Roma, sai por Milão</p>
          <ol className="relative mt-3 grid grid-cols-4 text-xs">
            {/* Linha da rota passando pelo centro das bolinhas, da primeira à última coluna */}
            <span className="absolute top-[5px] right-[12.5%] left-[12.5%] h-0.5 bg-border" aria-hidden />
            {[
              ["🏛️", "Roma", "var(--pin-hub-entrada)"],
              ["🎨", "Florença", "var(--pin-base)"],
              ["🏔️", "Dolomitas", "var(--pin-auge)"],
              ["⛪", "Milão", "var(--pin-hub-saida)"],
            ].map(([e, n, cor]) => (
              <li key={n} className="relative flex flex-col items-center gap-1 text-center">
                <span className="size-3 rounded-full ring-2 ring-surface" style={{ background: cor }} aria-hidden />
                <span className="text-base leading-none" aria-hidden>
                  {e}
                </span>
                <span>{n}</span>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
