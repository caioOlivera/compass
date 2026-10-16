import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BotaoComprar } from "@/components/compras/botoes";
import { cobrancaAtiva, PRODUTOS, saldo, type ProdutoAvulso } from "@/lib/creditos";
import { lerConfig } from "@/lib/configuracoes";
import { formatarPreco } from "@/lib/motor/catalogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Comprar — Compass" };

const ORDEM: ProdutoAvulso[] = ["roteiro", "assinado", "completo", "consultoria"];

const INCLUI: Record<ProdutoAvulso, string[]> = {
  roteiro: ["Roteiro dia a dia no mapa", "Dicas da base de relatos reais", "3 ajustes incluídos", "PDF para levar"],
  assinado: ["Um roteiro pronto do consultor", "Adaptado às suas datas e ao seu ritmo", "3 ajustes incluídos", "PDF para levar"],
  completo: ["Tudo do roteiro", "Passagens recomendadas com data da cotação", "2 ou 3 hotéis por cidade", "3 ajustes incluídos"],
  consultoria: [
    "Contato direto com o consultor",
    "Suporte 24 horas pelo WhatsApp, inclusive durante a viagem",
    "Roteiro sob medida a partir de um briefing detalhado",
    "Quem monta já rodou 4 continentes, 14 países e mais de 70 cidades",
  ],
};

type Props = { searchParams: Promise<{ produto?: string; roteiro?: string }> };

export default async function ComprarPage({ searchParams }: Props) {
  const { produto, roteiro } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/comprar");

  const admin = createAdminClient();
  const [precos, meses, ativa, meu] = await Promise.all([
    lerConfig<Record<string, number>>(admin, "precos_produtos", {}),
    lerConfig(admin, "validade_meses_b2c", 12),
    cobrancaAtiva(admin),
    saldo(supabase, { userId: user.id }),
  ]);
  const destaque = ORDEM.includes(produto as ProdutoAvulso) ? (produto as ProdutoAvulso) : null;
  const totalSaldo = Object.values(meu).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Escolha o que você precisa</h1>
          <p className="max-w-2xl text-text-2">
            Pague com Pix ou cartão. O crédito vale por {String(meses)} meses e, se não usar, você pode pedir o reembolso em até 7
            dias.
          </p>
          {totalSaldo > 0 && (
            <p className="text-sm text-text-2">
              Você tem{" "}
              {ORDEM.filter((t) => meu[t])
                .map((t) => `${meu[t]} ${PRODUTOS[t].titulo.toLowerCase()}`)
                .join(", ")}{" "}
              para usar.
            </p>
          )}
          {!ativa && (
            <p className="rounded-lg bg-accent/10 px-3 py-2.5 text-sm text-accent-strong">
              Por enquanto gerar roteiros é grátis. Você não precisa comprar nada para usar.
            </p>
          )}
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORDEM.map((p) => (
            <section
              key={p}
              className={cn(
                "flex flex-col gap-4 rounded-2xl border bg-surface p-5",
                destaque === p ? "border-accent ring-2 ring-accent/25" : "border-border",
              )}
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">{PRODUTOS[p].titulo}</h2>
                <p className="text-2xl font-semibold tabular-nums">{precos[p] ? formatarPreco(precos[p]) : "—"}</p>
                <p className="text-sm text-text-2">{PRODUTOS[p].descricao}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-1.5 text-sm">
                {INCLUI[p].map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
              <BotaoComprar
                produto={p}
                roteiroBaseId={p === "assinado" ? roteiro : undefined}
                rotulo={`Comprar ${PRODUTOS[p].titulo.toLowerCase()}`}
                variante={destaque === p ? "primario" : "secundario"}
              />
            </section>
          ))}
        </div>

        <p className="text-sm text-text-2">
          Tem uma agência?{" "}
          <Link href="/agencia" className="font-medium text-accent-strong hover:underline">
            Veja os planos Basic e Premium
          </Link>
          . Os preços das passagens nos roteiros completos são estimativas, com a data da cotação.
        </p>
      </main>
    </>
  );
}
