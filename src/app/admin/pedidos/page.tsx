import { BotaoReembolso } from "@/components/compras/botoes";
import { lerConfig } from "@/lib/configuracoes";
import { cobrancaAtiva, NOME_STATUS_PEDIDO, PRODUTOS, type ProdutoAvulso } from "@/lib/creditos";
import { formatarPreco } from "@/lib/motor/catalogo";
import { mercadoPagoConfigurado } from "@/lib/pagamentos/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function PedidosAdminPage() {
  const db = createAdminClient();
  const [{ data: pedidos }, dias, ativa] = await Promise.all([
    db.from("pedidos").select("*").order("created_at", { ascending: false }).limit(200),
    lerConfig(db, "reembolso_dias", 7),
    cobrancaAtiva(db),
  ]);
  const ids = [...new Set((pedidos ?? []).map((p) => p.user_id))];
  const { data: perfis } = ids.length ? await db.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const nomes = Object.fromEntries((perfis ?? []).map((p) => [p.id, p.full_name]));
  const pagos = (pedidos ?? []).filter((p) => p.status === "pago");
  const receita = pagos.reduce((a, p) => a + Number(p.valor), 0);
  const prazo = Number(dias) * 86_400_000;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p className="text-sm text-text-2">
          {pagos.length} pagos · {formatarPreco(receita)} · Mercado Pago {mercadoPagoConfigurado() ? "ligado" : "sem chave"} · cobrança{" "}
          {ativa ? "ligada" : "desligada (em Configurações)"}
        </p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-text-2">
            <tr className="border-b border-border">
              <th className="p-3 font-medium">Quando</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Produto</th>
              <th className="p-3 font-medium">Valor</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(pedidos ?? []).map((p) => {
              const noPrazo = p.status === "pago" && Date.now() - new Date(p.pago_em ?? p.created_at).getTime() <= prazo;
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3 whitespace-nowrap tabular-nums">{data.format(new Date(p.created_at))}</td>
                  <td className="p-3">{nomes[p.user_id] || p.user_id.slice(0, 8)}</td>
                  <td className="p-3">{PRODUTOS[p.produto as ProdutoAvulso]?.titulo ?? p.produto}</td>
                  <td className="p-3 tabular-nums">{formatarPreco(Number(p.valor))}</td>
                  <td className="p-3">
                    {NOME_STATUS_PEDIDO[p.status] ?? p.status}
                    {p.metodo ? ` · ${p.metodo}` : ""}
                  </td>
                  <td className="p-3 text-right">{noPrazo && <BotaoReembolso pedidoId={p.id} />}</td>
                </tr>
              );
            })}
            {!pedidos?.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-2">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
