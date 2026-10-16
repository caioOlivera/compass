"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { assinarPlano } from "@/app/actions/compras";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type PlanoCard = { id: "basic" | "premium"; titulo: string; preco: string; resumo: string; itens: string[]; destaque?: boolean };

/**
 * Cartões dos planos. Logado: escolhe o plano, informa o nome da agência (se ainda não tiver)
 * e segue para o Mercado Pago. Sem login: vai para o login e volta para cá.
 */
export function AssinarAgencia({ planos, logado, nomeAtual }: { planos: PlanoCard[]; logado: boolean; nomeAtual: string | null }) {
  const [escolhido, setEscolhido] = useState<PlanoCard["id"] | null>(null);
  const [nome, setNome] = useState(nomeAtual ?? "");
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {planos.map((p) => (
        <section
          key={p.id}
          className={cn(
            "flex flex-col gap-5 rounded-3xl border bg-surface p-6 sm:p-8",
            p.destaque ? "border-accent ring-2 ring-accent/20" : "border-border",
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">{p.titulo}</h3>
              {p.destaque && <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-strong">Para mais volume</span>}
            </div>
            <p className="text-3xl font-semibold tabular-nums">
              {p.preco}
              <span className="text-base font-normal text-text-2">/mês</span>
            </p>
            <p className="text-sm text-text-2">{p.resumo}</p>
          </div>
          <ul className="flex flex-1 flex-col gap-2 text-sm">
            {p.itens.map((i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
                {i}
              </li>
            ))}
          </ul>

          {!logado ? (
            <Link
              href="/login?next=/agencias"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium",
                p.destaque ? "bg-accent text-accent-contrast hover:opacity-90" : "border border-border hover:bg-surface-2",
              )}
            >
              Entrar para assinar
            </Link>
          ) : escolhido === p.id ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setErro("");
                iniciar(async () => {
                  const r = await assinarPlano(p.id, nome);
                  if (r.ok && r.url) window.location.href = r.url;
                  else setErro(r.ok ? "Não foi possível abrir a assinatura." : r.mensagem);
                });
              }}
            >
              {nomeAtual ? (
                <p className="text-sm text-text-2">
                  Agência: <strong className="font-medium text-text">{nomeAtual}</strong>
                </p>
              ) : (
                <Field label="Nome da agência" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Rota Viagens" required autoFocus />
              )}
              <FormAlert>{erro}</FormAlert>
              <Button type="submit" carregando={ocupado}>
                Ir para o pagamento
              </Button>
              <p className="text-xs text-text-3">Cartão de crédito, cobrança mensal pelo Mercado Pago. Cancele quando quiser.</p>
            </form>
          ) : (
            <Button type="button" variante={p.destaque ? "primario" : "secundario"} onClick={() => setEscolhido(p.id)}>
              Assinar {p.titulo.replace("Compass ", "")}
            </Button>
          )}
        </section>
      ))}
    </div>
  );
}
