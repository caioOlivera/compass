"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { MapaPontos } from "@/components/landing/mapa-pontos";
import { T } from "@/components/landing/type";
import type { Foto } from "@/lib/images/fotos";
import { cn } from "@/lib/utils";

const ETAPAS = [
  {
    nome: "Região",
    perguntas: "Pergunta 1 de 8",
    frase: "Primeiro, para onde",
    texto: "Escolha uma região do mundo, ou mais de uma. Não precisa saber cidades nem aeroportos: entradas, bases e saídas a Compass encontra dentro dela.",
  },
  {
    nome: "Datas",
    perguntas: "Pergunta 2 de 8",
    frase: "Depois, quando",
    texto: "Saída e volta, com quantos dias de folga você aceita para cada lado. A folga ajuda a achar voos melhores e a encaixar a melhor época de cada lugar.",
  },
  {
    nome: "Auge",
    perguntas: "Perguntas 3 e 4 de 8",
    frase: "O lugar que faz a viagem valer",
    texto: "Diga o auge, e o resto se organiza em volta dele. Se quiser, inclua cidades que não podem faltar e as que prefere pular.",
  },
  {
    nome: "Quem vai",
    perguntas: "Perguntas 5 a 8 de 8",
    frase: "Quem vai e do que gostam",
    texto: "Adultos, crianças, orçamento, interesses, cidade de saída e ritmo. É isso que decide hotel, transporte e quantos dias em cada parada.",
  },
  {
    nome: "Rota",
    perguntas: "Pronto",
    frase: "E a rota sai pronta",
    texto: "Entrada por uma cidade, saída por outra, dias contados por parada, trechos com meio de transporte e tempo, tudo no mapa. Dá para ajustar depois em linguagem natural.",
  },
] as const;

const INTERVALO = 6000;

/** Como funciona: as etapas do questionário, cada uma com um visual da tela real. */
export function Stages({ fotoAuge }: { fotoAuge?: Foto | null }) {
  const [etapa, setEtapa] = useState(0);
  const [auto, setAuto] = useState(true);
  const total = ETAPAS.length;

  const ir = useCallback(
    (i: number, manual = true) => {
      if (manual) setAuto(false);
      setEtapa((i + total) % total);
    },
    [total],
  );

  // Avança sozinho até a pessoa mexer; respeita quem pediu menos movimento
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => ir(etapa + 1, false), INTERVALO);
    return () => clearTimeout(t);
  }, [auto, etapa, ir]);

  const e = ETAPAS[etapa];

  return (
    <div
      id="etapas"
      role="group"
      aria-roledescription="carrossel"
      aria-labelledby="etapa-atual"
      className="flex flex-col bg-surface"
      onKeyDown={(ev) => {
        if (ev.key === "ArrowRight") ir(etapa + 1);
        if (ev.key === "ArrowLeft") ir(etapa - 1);
      }}
      onMouseEnter={() => setAuto(false)}
    >
      {/* Abas numeradas: dá para ver de cara quantas etapas são e pular para qualquer uma */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3 sm:px-6" role="tablist" aria-label="Etapas">
        {ETAPAS.map((x, i) => (
          <button
            key={x.nome}
            type="button"
            role="tab"
            aria-selected={i === etapa}
            onClick={() => ir(i)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-3 pt-2 pb-3 text-sm transition-colors",
              i === etapa ? "font-medium text-text" : "text-text-2 hover:text-text",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors",
                i === etapa ? "bg-accent text-accent-contrast" : i < etapa ? "bg-accent/15 text-accent-strong" : "bg-surface-2",
              )}
            >
              {i + 1}
            </span>
            {x.nome}
            {i === etapa && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 overflow-hidden bg-surface-2">
                <motion.span
                  key={`${etapa}-${auto}`}
                  className="block h-full bg-accent"
                  initial={{ width: auto ? "0%" : "100%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: auto ? INTERVALO / 1000 : 0, ease: "linear" }}
                />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid lg:min-h-[520px] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="order-2 flex flex-col justify-between gap-8 px-5 py-8 sm:px-8 lg:order-1 lg:py-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={etapa}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <p className="text-sm font-medium text-accent-strong">{e.perguntas}</p>
              <h3 id="etapa-atual" className={`max-w-[18ch] ${T.titulo}`}>
                {e.frase}
              </h3>
              <p className={`max-w-[46ch] ${T.corpo} text-text-2`}>{e.texto}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => ir(etapa - 1)}
              className="flex size-11 items-center justify-center rounded-full border border-border hover:bg-surface-2"
              aria-label="Etapa anterior"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => ir(etapa + 1)}
              className="inline-flex h-11 items-center gap-1 rounded-full bg-text px-5 text-sm font-medium text-bg hover:opacity-90"
            >
              {etapa === total - 1 ? "Ver de novo" : "Próxima"} <ChevronRight className="size-4" aria-hidden />
            </button>
            <span className="ml-2 text-sm text-text-2 tabular-nums">
              {etapa + 1} / {total}
            </span>
          </div>
        </div>

        <div className="relative order-1 flex min-h-[340px] items-center justify-center overflow-hidden bg-field-warm px-5 py-8 lg:order-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={etapa}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) ir(etapa + 1);
                else if (info.offset.x > 60) ir(etapa - 1);
              }}
              className="w-full max-w-[480px] cursor-grab active:cursor-grabbing"
            >
              <Visual etapa={etapa} fotoAuge={fotoAuge} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const cartao = "rounded-2xl bg-white p-5 text-text shadow-sm";

function Visual({ etapa, fotoAuge }: { etapa: number; fotoAuge?: Foto | null }) {
  if (etapa === 0) {
    return (
      <div data-ui className={cartao}>
        <p className="mb-3 font-medium">Para onde você vai?</p>
        <MapaPontos regiao="europa" className="w-full text-text" />
        <div className="mt-4 flex flex-wrap gap-1.5 text-sm">
          {["🗽 América do Norte", "🌎 América do Sul", "🏰 Europa", "🏯 Ásia Leste", "🕌 Oriente Médio", "🦘 Oceania"].map((r) => (
            <span key={r} className={cn("rounded-full px-3 py-1.5", r.includes("Europa") ? "bg-accent font-medium text-accent-contrast" : "bg-surface")}>
              {r}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (etapa === 1) {
    // Setembro de 2026 começa numa terça
    const vazios = 2;
    return (
      <div data-ui className={cartao}>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-medium">Setembro 2026</p>
          <p className="text-sm text-text-2">☀️ fim do verão nos Alpes</p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm tabular-nums">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span key={i} className="pb-1 text-xs text-text-2">
              {d}
            </span>
          ))}
          {Array.from({ length: vazios }, (_, i) => (
            <span key={`v${i}`} />
          ))}
          {Array.from({ length: 30 }, (_, i) => {
            const dia = i + 1;
            const ponta = dia === 10 || dia === 25;
            const dentro = dia > 10 && dia < 25;
            const folga = dia === 8 || dia === 9 || dia === 11 || dia === 12;
            return (
              <span
                key={dia}
                className={cn(
                  "rounded-md py-1.5",
                  ponta && "bg-accent font-semibold text-accent-contrast",
                  dentro && !ponta && "bg-accent/15",
                  folga && !dentro && !ponta && "outline outline-1 outline-dashed outline-accent",
                )}
              >
                {dia}
              </span>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-surface px-3 py-1.5">✈️ Saída 10/09</span>
          <span className="rounded-full bg-surface px-3 py-1.5">🏠 Volta 25/09</span>
          <span className="rounded-full bg-accent/10 px-3 py-1.5 font-medium text-accent-strong">15 dias · ± 2 na ida</span>
        </div>
      </div>
    );
  }
  if (etapa === 2) {
    return (
      <div data-ui className="overflow-hidden rounded-2xl bg-white text-text shadow-sm">
        <div className="relative aspect-[16/9] bg-[#3b5f7a]">
          {fotoAuge ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto externa, tamanho certo
            <img src={fotoAuge.media} alt={fotoAuge.alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" draggable={false} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-6xl" aria-hidden>
              🏔️
            </span>
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium shadow-sm">⭐ Auge: Dolomitas</span>
        </div>
        <div className="flex flex-col gap-3 p-5 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-text-2">Quero passar por</span>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-strong">🏛️ Roma</span>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-strong">⛪ Milão</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-text-2">Prefiro pular</span>
            <span className="rounded-full bg-surface px-3 py-1 text-text-2 line-through">🚤 Veneza</span>
          </div>
        </div>
      </div>
    );
  }
  if (etapa === 3) {
    return (
      <div data-ui className={`${cartao} flex flex-col gap-4 text-sm`}>
        <div className="flex items-center justify-between">
          <span className="text-text-2">Quem vai</span>
          <span className="text-2xl" aria-label="2 adultos e 1 criança">
            🧑🏻 👩🏽 👧🏼
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-2">Orçamento</span>
          <span className="flex gap-1" aria-label="Conforto">
            {["Econômico", "Médio", "Conforto", "Luxo"].map((o) => (
              <span key={o} className={cn("rounded-full px-2.5 py-1 text-xs", o === "Conforto" ? "bg-accent text-accent-contrast" : "bg-surface text-text-2")}>
                {o}
              </span>
            ))}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-text-2">Do que vocês gostam</span>
          <span className="flex flex-wrap gap-1.5">
            {["🥾 Trilhas", "🍝 Gastronomia", "📸 Fotografia", "🏛️ História"].map((x, i) => (
              <span key={x} className={cn("rounded-full px-3 py-1", i < 3 ? "bg-accent/10 text-accent-strong" : "bg-surface text-text-2")}>
                {x}
              </span>
            ))}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-2">Saindo de</span>
          <span className="font-medium">🛫 São Paulo (GRU)</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="flex justify-between text-text-2">
            Ritmo <span className="font-medium text-text">Médio</span>
          </span>
          <span className="relative h-2 rounded-full bg-surface">
            <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-accent" />
            <span className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white" />
          </span>
        </div>
      </div>
    );
  }
  const paradas = [
    { nome: "Roma", emoji: "🏛️", dias: 3, cor: "var(--pin-hub-entrada)" },
    { nome: "Florença", emoji: "🎨", dias: 2, cor: "var(--pin-base)" },
    { nome: "Dolomitas", emoji: "🏔️", dias: 8, cor: "var(--pin-auge)" },
    { nome: "Milão", emoji: "⛪", dias: 2, cor: "var(--pin-hub-saida)" },
  ];
  return (
    <div data-ui className={cartao}>
      <p className="font-medium">Itália de Roma às Dolomitas</p>
      <p className="text-sm text-text-2">✈️ entra por Roma (FCO) · sai por Milão (MXP)</p>
      {/* Barra dos 15 dias, cada parada na proporção dos dias */}
      <div className="mt-4 flex h-3 overflow-hidden rounded-full">
        {paradas.map((p) => (
          <span key={p.nome} style={{ flex: p.dias, background: p.cor }} />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {paradas.map((p, i) => (
          <li key={p.nome} className="flex items-center gap-3">
            <span className="size-3 rounded-full" style={{ background: p.cor }} aria-hidden />
            <span className="flex-1">
              <span aria-hidden>{p.emoji}</span> {p.nome}
              {i < paradas.length - 1 && <span className="text-text-3"> · {["🚄 1h30", "🚗 5h", "🚗 3h"][i]}</span>}
            </span>
            <span className="tabular-nums text-text-2">{p.dias} dias</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
