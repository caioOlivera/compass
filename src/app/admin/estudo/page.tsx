import { BotoesEstudo } from "@/components/admin/botoes-estudo";
import { createAdminClient } from "@/lib/supabase/admin";
import { desviosDePreco, medianaDesvio, resumirEstudo, ROTAS_ESTUDO } from "@/lib/viagem/estudo-rotas";
import { serpapiConfigurada, travelpayoutsConfigurado } from "@/lib/viagem/provedores";

export const dynamic = "force-dynamic";
// As ações do estudo rodam dezenas de consultas
export const maxDuration = 300;

const brl = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v));
const pct = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`);

export default async function EstudoPage() {
  const db = createAdminClient();
  const ultima = async (filtro: "voos" | "hoteis") => {
    let q = db.from("estudo_rotas").select("rodada, created_at").order("created_at", { ascending: false }).limit(1);
    q = filtro === "voos" ? q.neq("provedor", "serpapi_hoteis") : q.eq("provedor", "serpapi_hoteis");
    const { data } = await q.maybeSingle();
    if (!data) return null;
    const { data: linhas } = await db.from("estudo_rotas").select("*").eq("rodada", data.rodada).order("rota");
    return { quando: data.created_at, linhas: linhas ?? [] };
  };
  const [voos, hoteis] = await Promise.all([ultima("voos"), ultima("hoteis")]);
  const linhas = (voos?.linhas ?? []).map((l) => ({ ...l, preco_brl: l.preco_brl != null ? Number(l.preco_brl) : null }));
  const resumo = resumirEstudo(linhas);
  const desvios = desviosDePreco(linhas);
  const variantes = [...new Set(linhas.map((l) => `${l.provedor}|${l.variante}`))];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Estudo de passagens e hotéis</h1>
        <p className="max-w-3xl text-sm text-text-2">
          Testa as 20 rotas saindo do Brasil (dez/2026 a fev/2027) em cada fonte e variante: quantas acham preço, quanto demoram e,
          com o Google Flights ligado, quanto o preço de referência difere do ao vivo. Travelpayouts{" "}
          {travelpayoutsConfigurado() ? "ligada" : "sem TRAVELPAYOUTS_TOKEN"} · SerpApi {serpapiConfigurada() ? "ligada" : "sem SERPAPI_KEY"}.
        </p>
        <BotoesEstudo serpapi={serpapiConfigurada()} />
      </header>

      {voos && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Última rodada de voos · {new Date(voos.quando).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {resumo.map((r) => (
              <div key={`${r.provedor}${r.variante}`} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm text-text-2">
                  {r.provedor} · {r.variante}
                </p>
                <p className="text-2xl font-semibold tabular-nums">{Math.round((r.acertos / r.consultas) * 100)}%</p>
                <p className="text-xs text-text-3">
                  {r.acertos} de {r.consultas} com preço · mediana {r.latenciaMediana ?? "—"} ms{r.erros ? ` · ${r.erros} erros` : ""}
                </p>
              </div>
            ))}
            {desvios.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm text-text-2">Desvio Travelpayouts × Google</p>
                <p className="text-2xl font-semibold tabular-nums">{pct(medianaDesvio(desvios))}</p>
                <p className="text-xs text-text-3">mediana em {desvios.length} rotas (meta: até ±15%)</p>
              </div>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="text-left text-text-2">
                <tr className="border-b border-border">
                  <th className="p-3 font-medium">Rota</th>
                  {variantes.map((v) => (
                    <th key={v} className="p-3 font-medium">
                      {v.replace("|", " · ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROTAS_ESTUDO.map((r) => (
                  <tr key={r.n} className="border-b border-border last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {r.n}. {r.origem} → {r.destino} <span className="text-text-3">{r.tipo}</span>
                    </td>
                    {variantes.map((v) => {
                      const l = linhas.find((x) => x.rota === r.n && `${x.provedor}|${x.variante}` === v);
                      return (
                        <td key={v} className="p-3 tabular-nums" title={l?.erro ?? undefined}>
                          {!l ? "" : l.erro ? <span className="text-red-700">erro</span> : l.encontrou ? brl(l.preco_brl) : <span className="text-text-3">vazio</span>}
                          {l && <span className="block text-xs text-text-3">{l.latencia_ms} ms</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hoteis && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Última rodada de hotéis · {new Date(hoteis.quando).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hoteis.linhas.map((l) => {
              const d = (l.detalhe ?? {}) as { com_preco?: number; preco_do_booking?: number; exemplos?: string[] };
              return (
                <li key={l.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
                  <p className="font-medium">{l.destino}</p>
                  <p className="text-text-2">
                    {l.erro ? <span className="text-red-700">{l.erro}</span> : `${d.com_preco ?? 0} de ${l.ofertas} com diária · ${d.preco_do_booking ?? 0} com preço do Booking · ${l.latencia_ms} ms`}
                  </p>
                  <ul className="mt-1 text-xs text-text-3">
                    {(d.exemplos ?? []).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
