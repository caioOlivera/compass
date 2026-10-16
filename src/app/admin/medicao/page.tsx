import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { resumirUso, type LinhaUso } from "@/lib/medicao-painel";
import { cn } from "@/lib/utils";

const PERIODOS = [7, 30, 90] as const;
const ROTULO_TIPO: Record<string, string> = {
  geracao: "Geração de roteiro",
  adaptacao: "Adaptação (assinado)",
  ajuste: "Ajuste",
  extracao: "Extração da base",
  embedding: "Embeddings",
  busca_voo: "Busca de voos",
  busca_hotel: "Busca de hotéis",
};
const ROTULO_PRODUTO: Record<string, string> = {
  roteiro: "Roteiro (R$ 9,90)",
  assinado: "Roteiro assinado",
  completo: "Completo",
  consultoria: "Consultoria pessoal",
};

const reais = (v: number, casas = 2) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);

export default async function MedicaoPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { supabase } = await exigirAdmin();
  const { dias: pedido } = await searchParams;
  const dias = PERIODOS.find((p) => String(p) === pedido) ?? 30;
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();

  const [{ data: linhas }, { data: precos }, { data: pagos }] = await Promise.all([
    supabase
      .from("eventos_uso")
      .select("tipo, produto, user_id, trip_request_id, custo_brl, input_tokens, output_tokens, sucesso, created_at")
      .gte("created_at", desde)
      .order("created_at")
      .limit(20000),
    supabase.from("configuracoes").select("valor").eq("chave", "precos_produtos").maybeSingle(),
    supabase.from("pedidos").select("valor").eq("status", "pago").gte("pago_em", desde),
  ]);
  const receita = (pagos ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const r = resumirUso((linhas ?? []) as LinhaUso[], (precos?.valor as Record<string, number>) ?? {});
  const maxDia = Math.max(...r.porDia.map((d) => d.custo), 0.0001);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Medição</h1>
          <p className="text-text-2">Quanto custa cada consulta (IA, embeddings, APIs) e quanto sobra em cada produto.</p>
        </div>
        <nav className="flex gap-1 text-sm" aria-label="Período">
          {PERIODOS.map((p) => (
            <Link
              key={p}
              href={`/admin/medicao?dias=${p}`}
              className={cn("rounded-full border px-3 py-1", p === dias ? "border-accent bg-accent/10 text-accent-strong" : "border-border text-text-2")}
            >
              {p} dias
            </Link>
          ))}
        </nav>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Custo no período" valor={reais(r.custoTotal)} />
        <Numero rotulo="Chamadas registradas" valor={String(r.eventos)} />
        <Numero rotulo="Falhas" valor={String(r.falhas)} />
        <Numero rotulo="Custo médio por chamada" valor={reais(r.eventos ? r.custoTotal / r.eventos : 0, 4)} />
        <Numero rotulo="Receita (pedidos pagos)" valor={reais(receita)} />
        <Numero rotulo="Resultado (receita − custo)" valor={reais(receita - r.custoTotal)} />
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Margem por produto</h2>
        <Tabela
          cabecalho={["Produto", "Consultas", "Custo médio", "Preço", "Margem bruta"]}
          linhas={r.porProduto.map((p) => [
            ROTULO_PRODUTO[p.produto] ?? p.produto,
            String(p.consultas),
            reais(p.custoMedio, 4),
            p.preco === null ? "—" : reais(p.preco),
            p.margem === null ? "—" : `${reais(p.margem)} (${p.margemPct!.toFixed(1)}%)`,
          ])}
          vazio="Nenhuma consulta no período."
        />
        <p className="text-xs text-text-3">
          Margem antes das taxas do meio de pagamento e dos impostos. Custos de IA calculados pelos preços em Configurações (no plano grátis
          do Gemini o custo real é zero; o número mostra quanto custaria pago).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Por tipo de chamada</h2>
        <Tabela
          cabecalho={["Tipo", "Chamadas", "Tokens", "Custo"]}
          linhas={r.porTipo.map((t) => [ROTULO_TIPO[t.tipo] ?? t.tipo, String(t.n), t.tokens.toLocaleString("pt-BR"), reais(t.custo, 4)])}
          vazio="Nada registrado."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Custo por dia</h2>
        {r.porDia.length === 0 ? (
          <p className="text-sm text-text-2">Nada registrado.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {r.porDia.map((d) => (
              <li key={d.dia} className="grid grid-cols-[90px_1fr_110px] items-center gap-3 text-sm">
                <span className="text-text-2 tabular-nums">{d.dia.slice(8)}/{d.dia.slice(5, 7)}</span>
                <span className="h-3 rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (d.custo / maxDia) * 100)}%` }} />
                </span>
                <span className="text-right tabular-nums">{reais(d.custo, 4)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Quem mais consome</h2>
        <Tabela
          cabecalho={["Usuário", "Chamadas", "Custo"]}
          linhas={r.porUsuario.map((u) => [u.user_id.slice(0, 8), String(u.n), reais(u.custo, 4)])}
          vazio="Nada registrado."
        />
      </section>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="text-sm text-text-2">{rotulo}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}

function Tabela({ cabecalho, linhas, vazio }: { cabecalho: string[]; linhas: string[][]; vazio: string }) {
  if (!linhas.length) return <p className="text-sm text-text-2">{vazio}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-text-2">
          <tr>
            {cabecalho.map((c) => (
              <th key={c} className="px-4 py-2.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-t border-border">
              {l.map((c, j) => (
                <td key={j} className={cn("px-4 py-2.5", j > 0 && "tabular-nums")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
