"use client";

import { AlertTriangle, ArrowLeft, CalendarDays, Gauge, Plane } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { LegResumo } from "@/components/itinerary/leg-info";
import { FotoDestino } from "@/components/ui/foto";
import type { FotosPorPonto } from "@/lib/itinerary/fotos";
import type { StatusSalvamento } from "@/hooks/use-checklist";
import { COR_PONTO, ROTULO_TIPO_PONTO, type Selecao, type Trecho } from "@/lib/itinerary/map";
import type { Itinerary } from "@/lib/validation/itinerary";
import { cn } from "@/lib/utils";

type Props = {
  roteiro: Itinerary;
  fotos: FotosPorPonto;
  trechos: Trecho[];
  selecao: Selecao;
  onSelecionar: (s: Selecao) => void;
  progresso: { marcados: number; total: number };
  status: StatusSalvamento;
  onTentarDeNovo: () => void;
  voltar: { href: string; rotulo: string };
};

export function RouteSidebar({ roteiro, fotos, trechos, selecao, onSelecionar, progresso, status, onTentarDeNovo, voltar }: Props) {
  const r = roteiro.resumo_estrategico;
  const pct = progresso.total ? Math.round((progresso.marcados / progresso.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-5">
      <header className="flex flex-col gap-3">
        <Link href={voltar.href} className="inline-flex w-fit items-center gap-1 text-sm text-text-2 hover:text-text">
          <ArrowLeft className="size-4" aria-hidden />
          {voltar.rotulo}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{roteiro.titulo}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-2">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            {r.total_dias_viagem} dias
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="size-4" aria-hidden />
            {r.ritmo_aplicado}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <p className="flex items-start gap-2 text-sm font-medium">
          <Plane className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
          {r.logistica_voos}
        </p>
        <p className="text-sm text-text-2">{r.estrategia_deslocamento}</p>
        <details className="group text-sm">
          <summary className="cursor-pointer text-text-2 hover:text-text">Por que esta rota é fluida</summary>
          <p className="mt-2 text-text-2">{r.justificativa_fluidez}</p>
        </details>
      </section>

      {r.alertas.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm">
          <h2 className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 text-amber-600" aria-hidden />
            Fique de olho
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-text-2">
            {r.alertas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Checklist</span>
          <span className="text-text-2 tabular-nums">
            {progresso.marcados} de {progresso.total}
            <StatusSalvo status={status} onTentarDeNovo={onTentarDeNovo} />
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do checklist">
          <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${pct}%` }} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide text-text-3 uppercase">Rota</h2>
        <ol className="flex flex-col">
          {roteiro.pontos_mapa.map((p, i) => {
            const trecho = trechos.find((t) => t.de.id_ponto === p.id_ponto);
            const ativo = selecao?.tipo === "ponto" && selecao.id === p.id_ponto;
            const trechoAtivo = trecho && selecao?.tipo === "trecho" && selecao.id === trecho.id;
            return (
              <li key={p.id_ponto} className="relative">
                <button
                  type="button"
                  onClick={() => onSelecionar({ tipo: "ponto", id: p.id_ponto })}
                  aria-current={ativo || undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-surface-2",
                    ativo && "bg-surface-2",
                  )}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: COR_PONTO[p.tipo_ponto] }}
                  >
                    {p.ordem}
                  </span>
                  {fotos[p.id_ponto] && (
                    <FotoDestino foto={fotos[p.id_ponto]} className="size-11 shrink-0 rounded-lg" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      <span aria-hidden>{p.emoji} </span>
                      {p.nome_local}
                    </span>
                    <span className="text-xs text-text-3">{ROTULO_TIPO_PONTO[p.tipo_ponto]}</span>
                  </span>
                  <span className="shrink-0 text-sm text-text-2 tabular-nums">
                    {p.dias_alocados} {p.dias_alocados === 1 ? "dia" : "dias"}
                  </span>
                </button>
                {trecho && i < roteiro.pontos_mapa.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onSelecionar({ tipo: "trecho", id: trecho.id })}
                    className={cn(
                      "ml-[23px] flex w-[calc(100%-23px)] items-center border-l-2 border-dashed border-border py-2 pl-5 text-left transition hover:border-text-3",
                      trechoAtivo && "border-solid border-text-2",
                    )}
                  >
                    <LegResumo deslocamento={trecho.deslocamento} />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function StatusSalvo({ status, onTentarDeNovo }: { status: StatusSalvamento; onTentarDeNovo: () => void }) {
  if (status === "ocioso") return null;
  if (status === "erro") {
    return (
      <button type="button" onClick={onTentarDeNovo} className="ml-2 text-red-600 underline">
        não salvou, tentar de novo
      </button>
    );
  }
  return <span className="ml-2 text-text-3">{status === "salvando" ? "salvando…" : "salvo"}</span>;
}
