"use client";

import { BedDouble, Map, Plane } from "lucide-react";
import Link from "next/link";
import type { OpcoesGeracao } from "@/lib/creditos";
import { cn } from "@/lib/utils";

export type ProdutoGeracao = "roteiro" | "completo";

/** Última etapa: o que vai ser gerado e com qual crédito. */
export function EscolhaProduto({
  opcoes,
  produto,
  onMudar,
}: {
  opcoes: OpcoesGeracao;
  produto: ProdutoGeracao;
  onMudar: (p: ProdutoGeracao) => void;
}) {
  if (opcoes.modo === "cortesia" || opcoes.modo === "plano") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent-strong">
        <Plane className="size-4 shrink-0" aria-hidden />
        Seu acesso inclui passagens e hotéis: o roteiro já chega completo.
        {opcoes.modo === "plano" && opcoes.completo > 0 ? ` (${opcoes.completo} consultas no mês)` : ""}
      </p>
    );
  }
  if (opcoes.modo === "lancamento") return null;

  if (opcoes.roteiro === 0 && opcoes.completo === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="font-medium">Você não tem créditos para gerar.</p>
        <p className="text-text-2">Suas respostas ficam salvas aqui. Compre um roteiro ou um completo e volte para gerar.</p>
        <Link href="/comprar" className="self-start font-medium text-accent-strong hover:underline">
          Ver opções →
        </Link>
      </div>
    );
  }

  const cartao = (id: ProdutoGeracao, titulo: string, texto: string, saldo: number, icones: React.ReactNode) => (
    <label
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 text-sm transition",
        produto === id ? "border-accent bg-accent/5 ring-2 ring-accent/20" : "border-border bg-surface",
        saldo === 0 && "cursor-not-allowed opacity-50",
      )}
    >
      <input type="radio" name="produto" value={id} checked={produto === id} disabled={saldo === 0} onChange={() => onMudar(id)} className="sr-only" />
      <span className="flex items-center justify-between gap-2 font-medium">
        <span className="flex items-center gap-1.5">{icones}{titulo}</span>
        <span className="text-xs font-normal text-text-2">{saldo === 0 ? "sem crédito" : `${saldo} ${saldo === 1 ? "crédito" : "créditos"}`}</span>
      </span>
      <span className="text-text-2">{texto}</span>
    </label>
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">O que você quer receber?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {cartao("roteiro", "Roteiro", "Rota no mapa, dia a dia, checklist e PDF.", opcoes.roteiro, <Map className="size-4" aria-hidden />)}
        {cartao(
          "completo",
          "Completo",
          "Tudo do roteiro + passagens e 2 ou 3 hotéis por cidade, na mesma hora.",
          opcoes.completo,
          <>
            <Plane className="size-4" aria-hidden />
            <BedDouble className="size-4" aria-hidden />
          </>,
        )}
      </div>
    </fieldset>
  );
}

/** Produto inicial: o pedido na URL quando há crédito; senão, o que tiver crédito (roteiro primeiro). */
export function produtoPadrao(opcoes: OpcoesGeracao | null, pedido?: ProdutoGeracao): ProdutoGeracao {
  if (!opcoes || opcoes.modo !== "creditos") return "roteiro";
  if (pedido && opcoes[pedido] > 0) return pedido;
  return opcoes.roteiro > 0 ? "roteiro" : opcoes.completo > 0 ? "completo" : "roteiro";
}
