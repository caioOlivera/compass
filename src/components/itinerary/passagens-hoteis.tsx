"use client";

import { BedDouble, Loader2, Plane, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Extras } from "@/lib/viagem/completo-plano";

export type InfoCompleto = {
  itineraryId: string;
  extras: Extras | null;
  /** Texto do custo ao adicionar: "Incluído", "1 crédito Completo (R$ 49,90)", "Grátis por enquanto" */
  custo: string;
};

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const dataCurta = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Produto completo: passagens de referência e 2–3 hotéis por cidade, com a data de cada cotação. */
export function PassagensHoteis({ info }: { info: InfoCompleto }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ texto: string; comprar?: string } | null>(null);
  const x = info.extras;

  async function pedir(atualizar = false) {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/itineraries/${info.itineraryId}/completo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atualizar }),
      });
      const corpo = await res.json().catch(() => ({}));
      if (!res.ok) setErro({ texto: corpo.error ?? "Não foi possível consultar os preços.", comprar: corpo.comprar });
      else router.refresh();
    } catch {
      setErro({ texto: "Sem conexão. Tente de novo." });
    }
    setEnviando(false);
  }

  if (!x) {
    return (
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Plane className="size-4 text-accent-strong" aria-hidden /> Passagens e hotéis
        </h2>
        <p className="text-sm text-text-2">Preço de referência das passagens e 2 ou 3 hotéis por cidade, nas datas do roteiro.</p>
        {erro && (
          <p className="text-sm text-red-600">
            {erro.texto}{" "}
            {erro.comprar && (
              <Link href={erro.comprar} className="font-medium underline">
                Comprar
              </Link>
            )}
          </p>
        )}
        <Button type="button" onClick={() => pedir()} disabled={enviando} className="h-10">
          {enviando ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Consultando preços…
            </>
          ) : (
            "Adicionar passagens e hotéis"
          )}
        </Button>
        <p className="text-xs text-text-3">{info.custo}</p>
      </section>
    );
  }

  const openJaw = x.trechos.length === 2;
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Plane className="size-4 text-accent-strong" aria-hidden /> Passagens e hotéis
        </h2>
        <button
          type="button"
          onClick={() => pedir(true)}
          disabled={enviando}
          className="inline-flex items-center gap-1 text-xs text-text-2 hover:text-text disabled:opacity-60"
        >
          <RefreshCw className={enviando ? "size-3 animate-spin" : "size-3"} aria-hidden /> Atualizar preços
        </button>
      </div>

      {x.trechos.length === 0 && <p className="text-sm text-text-2">Não identificamos os aeroportos deste roteiro.</p>}
      <ul className="flex flex-col gap-2">
        {x.trechos.map((t) => {
          const o = t.ofertas[0];
          return (
            <li key={t.rotulo} className="flex flex-col gap-0.5 rounded-lg bg-bg p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">
                  {t.rotulo}: {t.consulta.origem} → {t.consulta.destino}
                </span>
                <span className="text-xs text-text-2">
                  {dataCurta(t.consulta.ida)}
                  {t.consulta.volta ? ` – ${dataCurta(t.consulta.volta)}` : ""}
                </span>
              </div>
              {o ? (
                <span>
                  a partir de <strong className="tabular-nums">{brl(o.preco_brl)}</strong> por pessoa
                  {o.companhia ? ` · ${o.companhia}` : ""}
                  {o.escalas != null ? ` · ${o.escalas === 0 ? "direto" : `${o.escalas} ${o.escalas === 1 ? "escala" : "escalas"}`}` : ""}
                </span>
              ) : (
                <span className="text-text-2">Sem preço recente para esta data.</span>
              )}
              <span className="flex items-baseline justify-between gap-2 text-xs text-text-3">
                <span>{t.cotado_em ? `Cotado em ${quando(t.cotado_em)}` : "Sem cotação"}</span>
                <a href={o?.link ?? t.link_busca} target="_blank" rel="noopener sponsored" className="font-medium text-accent-strong hover:underline">
                  Ver passagens
                </a>
              </span>
            </li>
          );
        })}
      </ul>
      {openJaw && <p className="text-xs text-text-3">Soma de dois trechos só de ida. Um bilhete multidestino com a mesma rota costuma sair mais barato.</p>}

      <ul className="flex flex-col gap-3">
        {x.estadias.map((e) => (
          <li key={e.id_ponto} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <BedDouble className="size-4 text-text-2" aria-hidden /> {e.cidade}
              </span>
              <span className="text-xs text-text-2">
                {dataCurta(e.checkin)} – {dataCurta(e.checkout)} · {e.noites} {e.noites === 1 ? "noite" : "noites"}
              </span>
            </div>
            {e.hoteis.length ? (
              <ul className="flex flex-col divide-y divide-border rounded-lg bg-bg text-sm">
                {e.hoteis.map((h) => (
                  <li key={h.nome}>
                    <a href={h.link} target="_blank" rel="noopener sponsored" className="flex items-center justify-between gap-3 p-2.5 hover:text-accent-strong">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{h.nome}</span>
                        <span className="text-xs text-text-3">
                          {h.estrelas ? `${h.estrelas}★ · ` : ""}
                          {h.nota ? (
                            <>
                              <Star className="inline size-3" aria-hidden /> {h.nota.toFixed(1)}
                              {h.avaliacoes ? ` (${h.avaliacoes.toLocaleString("pt-BR")})` : ""}
                            </>
                          ) : null}
                        </span>
                      </span>
                      {h.diaria_brl != null && <span className="shrink-0 text-right tabular-nums">{brl(h.diaria_brl)}<span className="block text-xs text-text-3">por noite</span></span>}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <a href={e.link_busca} target="_blank" rel="noopener sponsored" className="text-sm font-medium text-accent-strong hover:underline">
                Ver hotéis em {e.cidade} nessas datas
              </a>
            )}
            {e.cotado_em && <span className="text-xs text-text-3">Diárias cotadas em {quando(e.cotado_em)}</span>}
          </li>
        ))}
      </ul>

      {erro && <p className="text-sm text-red-600">{erro.texto}</p>}
      <p className="text-xs text-text-3">
        Preços de referência, consultados na data indicada. Podem mudar até a compra. Podemos receber comissão pelos links, sem custo extra
        para você.
      </p>
    </section>
  );
}
