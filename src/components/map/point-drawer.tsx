"use client";

import { ChevronLeft, ChevronRight, MoonStar } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { LegDetalhe } from "@/components/itinerary/leg-info";
import { FotoDestino } from "@/components/ui/foto";
import type { FotosPorPonto } from "@/lib/itinerary/fotos";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { COR_PONTO, itemMarcado, ROTULO_TIPO_PONTO } from "@/lib/itinerary/map";
import type { ChecklistState, PontoMapa } from "@/lib/validation/itinerary";
import { cn } from "@/lib/utils";

type Props = {
  ponto: PontoMapa | undefined;
  pontos: PontoMapa[];
  fotos: FotosPorPonto;
  lado: "right" | "bottom";
  checklist: ChecklistState;
  onAlternar: (idPonto: string, indice: number) => void;
  onIrPara: (idPonto: string) => void;
  onFechar: () => void;
};

export function PointDrawer({ ponto, pontos, fotos, lado, checklist, onAlternar, onIrPara, onFechar }: Props) {
  const foto = ponto ? fotos[ponto.id_ponto] : null;
  const indice = ponto ? pontos.indexOf(ponto) : -1;
  const anterior = pontos[indice - 1];
  const proximo = pontos[indice + 1];

  return (
    // modal={false}: o mapa continua navegável; clicar em outro pin só troca o conteúdo.
    <Sheet open={!!ponto} onOpenChange={(aberto) => !aberto && onFechar()} modal={false}>
      <SheetContent
        side={lado}
        overlay={false}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="lg:top-0 lg:max-w-[420px]"
      >
        {ponto && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={ponto.id_ponto}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {foto && (
                <figure className="shrink-0">
                  <FotoDestino foto={foto} className="h-44 sm:h-52" />
                  <figcaption className="px-5 pt-1.5 text-[11px] text-text-3">
                    Foto:{" "}
                    <a href={foto.autorUrl} target="_blank" rel="noreferrer" className="underline hover:text-text-2">
                      {foto.autor}
                    </a>{" "}
                    /{" "}
                    <a href={foto.fonteUrl} target="_blank" rel="noreferrer" className="underline hover:text-text-2">
                      {foto.fonte}
                    </a>
                  </figcaption>
                </figure>
              )}
              <SheetHeader className={foto ? "pt-3" : undefined}>
                <span className="flex items-center gap-2 text-xs font-medium text-text-2">
                  <span
                    className="flex size-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: COR_PONTO[ponto.tipo_ponto] }}
                  >
                    {ponto.ordem}
                  </span>
                  {ROTULO_TIPO_PONTO[ponto.tipo_ponto]}
                </span>
                <SheetTitle>
                  <span aria-hidden>{ponto.emoji} </span>
                  {ponto.nome_local}
                </SheetTitle>
                <SheetDescription>{ponto.subtitulo_card}</SheetDescription>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                  <MoonStar className="size-4 text-accent-strong" aria-hidden />
                  {ponto.dias_alocados} {ponto.dias_alocados === 1 ? "dia" : "dias"} nesta base
                </p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <h3 className="mb-2 text-xs font-medium tracking-wide text-text-3 uppercase">O que fazer</h3>
                <ul className="flex flex-col">
                  {ponto.atribuicoes_e_checklist.map((item, i) => {
                    const marcado = itemMarcado(checklist, ponto.id_ponto, i);
                    const id = `${ponto.id_ponto}-item-${i}`;
                    return (
                      <li key={id} className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
                        <Checkbox
                          id={id}
                          checked={marcado}
                          onCheckedChange={() => onAlternar(ponto.id_ponto, i)}
                          className="mt-0.5"
                        />
                        <label htmlFor={id} className="flex flex-1 cursor-pointer flex-col gap-1">
                          <span className={cn("text-sm transition-colors", marcado && "text-text-3 line-through")}>
                            {item.item}
                          </span>
                          <span
                            className={cn(
                              "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
                              item.categoria === "Imperdível"
                                ? "bg-accent/12 text-accent-strong"
                                : "bg-surface-2 text-text-2",
                            )}
                          >
                            {item.categoria}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {ponto.proximo_deslocamento && proximo && (
                  <section className="mt-5 rounded-xl border border-border bg-bg p-4">
                    <h3 className="mb-2 text-xs font-medium tracking-wide text-text-3 uppercase">Próximo trecho</h3>
                    <LegDetalhe deslocamento={ponto.proximo_deslocamento} de={ponto.nome_local} para={proximo.nome_local} />
                  </section>
                )}
              </div>

              <nav className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
                <BotaoNavegar ponto={anterior} direcao="anterior" onIrPara={onIrPara} />
                <BotaoNavegar ponto={proximo} direcao="proximo" onIrPara={onIrPara} />
              </nav>
            </motion.div>
          </AnimatePresence>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BotaoNavegar({
  ponto,
  direcao,
  onIrPara,
}: {
  ponto: PontoMapa | undefined;
  direcao: "anterior" | "proximo";
  onIrPara: (id: string) => void;
}) {
  if (!ponto) return <span />;
  const Icone = direcao === "anterior" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={() => onIrPara(ponto.id_ponto)}
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-text-2 transition hover:bg-surface-2 hover:text-text",
        direcao === "proximo" && "flex-row-reverse text-right",
      )}
    >
      <Icone className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{ponto.nome_local}</span>
    </button>
  );
}
