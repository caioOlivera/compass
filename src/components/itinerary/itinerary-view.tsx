"use client";

import { List, Map as IconeMapa } from "lucide-react";
import { MotionConfig } from "motion/react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { InfoAjustes } from "@/components/itinerary/ajustar-roteiro";
import type { InfoCompleto } from "@/components/itinerary/passagens-hoteis";
import { RouteSidebar } from "@/components/itinerary/route-sidebar";
import { PointDrawer } from "@/components/map/point-drawer";
import { useChecklist } from "@/hooks/use-checklist";
import { useIsDesktop } from "@/hooks/use-media-query";
import { progressoChecklist, trechosDoRoteiro, type Selecao } from "@/lib/itinerary/map";
import type { FotosPorPonto } from "@/lib/itinerary/fotos";
import { cn } from "@/lib/utils";
import type { ChecklistState, Itinerary } from "@/lib/validation/itinerary";

// MapLibre usa window/WebGL: carrega só no navegador, e só nesta tela.
const ItineraryMap = dynamic(() => import("@/components/map/itinerary-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-2" />,
});

const LARGURA_PAINEL = 420;

type Props = {
  roteiro: Itinerary;
  /** Foto de cada parada (Unsplash/Pexels); vazio sem chave */
  fotos?: FotosPorPonto;
  checklistInicial: ChecklistState;
  /** Sem id = demonstração: o checklist não é salvo. */
  itineraryId?: string;
  voltar: { href: string; rotulo: string };
  /** Link para baixar o roteiro em PDF */
  pdfHref?: string;
  /** Quantos registros da base de conhecimento o roteiro usou */
  refsBase?: number;
  ajustes?: InfoAjustes;
  completo?: InfoCompleto;
};

export function ItineraryView({ roteiro, fotos = {}, checklistInicial, itineraryId, voltar, pdfHref, refsBase = 0, ajustes, completo }: Props) {
  const [selecao, setSelecao] = useState<Selecao>(null);
  // Celular: roteiro e mapa em abas de tela cheia (no desktop, lado a lado)
  const [aba, setAba] = useState<"roteiro" | "mapa">("roteiro");
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
      <div className="relative flex h-dvh flex-col lg:flex-row">
        <aside
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain border-border pb-[calc(4rem+env(safe-area-inset-bottom))] lg:order-1 lg:w-[400px] lg:flex-none lg:border-r lg:pb-0",
            aba === "mapa" && "max-lg:invisible",
          )}
          aria-hidden={(!desktop && aba === "mapa") || undefined}
        >
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
            pdfHref={pdfHref}
            refsBase={refsBase}
            ajustes={ajustes && itineraryId ? { itineraryId, info: ajustes } : undefined}
            completo={completo}
          />
        </aside>
        {/* O mapa fica sempre montado (o MapLibre precisa do tamanho real); no celular, só aparece na aba Mapa */}
        <main
          className={cn(
            "max-lg:absolute max-lg:inset-x-0 max-lg:top-0 max-lg:bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:relative lg:order-2 lg:flex-1",
            aba === "roteiro" && "max-lg:invisible",
          )}
          aria-hidden={(!desktop && aba === "roteiro") || undefined}
        >
          <ItineraryMap
            pontos={roteiro.pontos_mapa}
            trechos={trechos}
            selecao={selecao}
            onSelecionar={setSelecao}
            deslocamentoPainel={deslocamentoPainel}
          />
          <Legenda />
        </main>

        <nav
          aria-label="Ver"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          {(
            [
              ["roteiro", "Roteiro", List],
              ["mapa", "Mapa", IconeMapa],
            ] as const
          ).map(([id, rotulo, Icone]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              aria-pressed={aba === id}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                aba === id ? "text-accent-strong" : "text-text-2",
              )}
            >
              <Icone className="size-5" aria-hidden />
              {rotulo}
            </button>
          ))}
        </nav>
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
