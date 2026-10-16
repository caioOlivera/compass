"use client";

import { Loader2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InfoAjustes = {
  usados: number;
  inclusos: number;
  /** Com a cobrança ligada: quantos ajustes um novo crédito libera (0 = não dá para comprar mais) */
  pacoteExtra?: number;
  /** Versões do mesmo pedido, da primeira à última */
  versoes: { id: string; versao: number }[];
  versaoAtual: number;
};

const EXEMPLOS = ["Trocar Florença por Bolonha", "Mais um dia no auge e um a menos na saída", "Incluir um dia de praia"];

/** Pedido de ajuste em linguagem natural; cada um vira uma nova versão do roteiro. */
export function AjustarRoteiro({ itineraryId, info }: { itineraryId: string; info: InfoAjustes }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [comprar, setComprar] = useState("");
  const ultima = info.versaoAtual === info.versoes.at(-1)?.versao;
  const restantes = Math.max(info.inclusos - info.usados, 0);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setComprar("");
    setEnviando(true);
    try {
      const res = await fetch(`/api/itineraries/${itineraryId}/ajustes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: texto }),
      });
      const corpo = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (corpo.comprar) setComprar(corpo.comprar);
        throw new Error(corpo.error ?? "Não foi possível ajustar.");
      }
      router.push(`/roteiros/${corpo.itinerary_id}`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ajustar.");
      setEnviando(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Wand2 className="size-4 text-accent-strong" aria-hidden />
          Ajustar roteiro
        </h2>
        <span className="text-xs text-text-2 tabular-nums">
          {restantes} de {info.inclusos} {info.inclusos === 1 ? "ajuste" : "ajustes"} restantes
        </span>
      </div>

      {info.versoes.length > 1 && (
        <nav aria-label="Versões" className="flex flex-wrap gap-1 text-xs">
          {info.versoes.map((v) => (
            <Link
              key={v.id}
              href={`/roteiros/${v.id}`}
              aria-current={v.versao === info.versaoAtual || undefined}
              className={cn(
                "rounded-full border px-2.5 py-0.5",
                v.versao === info.versaoAtual ? "border-accent bg-accent/10 text-accent-strong" : "border-border text-text-2 hover:text-text",
              )}
            >
              v{v.versao}
            </Link>
          ))}
        </nav>
      )}

      {!ultima ? (
        <p className="text-sm text-text-2">Esta é uma versão anterior. Ajustes partem da versão mais recente.</p>
      ) : restantes === 0 && !info.pacoteExtra ? (
        <p className="text-sm text-text-2">Você usou os ajustes incluídos nesta consulta.</p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            maxLength={1000}
            disabled={enviando}
            placeholder="Ex.: troque Florença por Bolonha e coloque um dia a mais nas Dolomitas"
            className="w-full rounded-lg border border-border bg-bg p-3 text-sm outline-none placeholder:text-text-3 focus:border-accent focus:ring-2 focus:ring-accent/25"
            aria-label="O que você quer mudar"
          />
          {!texto && (
            <div className="flex flex-wrap gap-1.5">
              {EXEMPLOS.map((x) => (
                <button key={x} type="button" onClick={() => setTexto(x)} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-2 hover:text-text">
                  {x}
                </button>
              ))}
            </div>
          )}
          {restantes === 0 && (
            <p className="text-xs text-text-2">
              Os ajustes incluídos acabaram. O próximo consome 1 crédito e libera mais {info.pacoteExtra}.
            </p>
          )}
          {erro && (
            <p className="text-sm text-red-600">
              {erro}{" "}
              {comprar && (
                <Link href={comprar} className="font-medium underline">
                  Comprar crédito
                </Link>
              )}
            </p>
          )}
          <Button type="submit" disabled={enviando || texto.trim().length < 5} className="h-10 self-end">
            {enviando ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Ajustando (até 1 minuto)…
              </>
            ) : (
              "Aplicar ajuste"
            )}
          </Button>
        </form>
      )}
    </section>
  );
}
