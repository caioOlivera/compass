"use client";

import { MotionConfig } from "motion/react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { RouteSidebar } from "@/components/itinerary/route-sidebar";
import { PointDrawer } from "@/components/map/point-drawer";
import { useChecklist } from "@/hooks/use-checklist";
import { useIsDesktop } from "@/hooks/use-media-query";
import { progressoChecklist, trechosDoRoteiro, type Selecao } from "@/lib/itinerary/map";
import type { FotosPorPonto } from "@/lib/itinerary/fotos";
import type { ChecklistState, Itinerary } from "@/lib/validation/itinerary";

// MapLibre usa window/WebGL: carrega só no navegador, e só nesta tela.
const ItineraryMap = dynamic(() => import("@/components/map/itinerary-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-2" />,
});

const LARGURA_PAINEL = 420;

type Props = {
  roteiro: Itinerary;
  /** Foto de cada parada (Pexels); vazio sem chave */
  fotos?: FotosPorPonto;
  checklistInicial: ChecklistState;
  /** Sem id = demonstração: o checklist não é salvo. */
  itineraryId?: string;
  voltar: { href: string; rotulo: string };
};

export function ItineraryView({ roteiro, fotos = {}, checklistInicial, itineraryId, voltar }: Props) {
  const [selecao, setSelecao] = useState<Selecao>(null);
  const checklist = useChecklist(checklistInicial, itineraryId);
  const desktop = useIsDesktop();

  const trechos = useMemo(() => trechosDoRoteiro(roteiro), [roteiro]);
  const progresso = useMemo(() => progressoChecklist(roteiro, checklist.estado), [roteiro, checklist.estado]);
  const pontoAberto =
    selecao?.tipo === "ponto" ? roteiro.pontos_mapa.find((p) => p.id_ponto === selecao.id) : undefined;
  // No desktop o painel cobre a direita do mapa; no celular ele sobe por cima da lista, abaixo do mapa.
  const deslocamentoPainel = useMemo(() => ({ x: desktop && pontoAberto ? LARGURA_PAINEL : 0, y: 0 }), [desktop, pontoAberto]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-dvh flex-col lg:flex-row">
        <aside className="order-2 min-h-0 flex-1 overflow-y-auto border-border lg:order-1 lg:w-[400px] lg:flex-none lg:border-r">
          <RouteSidebar
            roteiro={roteiro}
            fotos={fotos}
            trechos={trechos}
            selecao={selecao}
            onSelecionar={setSelecao}
            progresso={progresso}
            status={checklist.status}
            onTentarDeNovo={checklist.tentarDeNovo}
            voltar={voltar}
          />
        </aside>
        <main className="relative order-1 h-[52dvh] shrink-0 lg:order-2 lg:h-auto lg:flex-1">
          <ItineraryMap
            pontos={roteiro.pontos_mapa}
            trechos={trechos}
            selecao={selecao}
            onSelecionar={setSelecao}
            deslocamentoPainel={deslocamentoPainel}
          />
          <Legenda />
        </main>
      </div>

      <PointDrawer
        ponto={pontoAberto}
        fotos={fotos}
        pontos={roteiro.pontos_mapa}
        lado={desktop ? "right" : "bottom"}
        checklist={checklist.estado}
        onAlternar={checklist.alternar}
        onIrPara={(id) => setSelecao({ tipo: "ponto", id })}
        onFechar={() => setSelecao(null)}
      />
    </MotionConfig>
  );
}

function Legenda() {
  const itens = [
    ["Entrada", "var(--pin-hub-entrada)"],
    ["No caminho", "var(--pin-base)"],
    ["Auge", "var(--pin-auge)"],
    ["Saída", "var(--pin-hub-saida)"],
  ] as const;
  return (
    <ul className="pointer-events-none absolute bottom-8 left-3 hidden gap-3 rounded-lg bg-surface/90 px-3 py-2 text-xs text-text-2 shadow-sm backdrop-blur-sm sm:flex">
      {itens.map(([rotulo, cor]) => (
        <li key={rotulo} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: cor }} />
          {rotulo}
        </li>
      ))}
    </ul>
  );
}
