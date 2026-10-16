import { BotaoRevogar, ConcederAcesso } from "@/components/admin/acessos";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function AcessosPage() {
  const db = createAdminClient();
  const { data: acessos } = await db.from("acessos_gratis").select("*").order("created_at", { ascending: false }).limit(300);
  const agora = Date.now();
  const situacao = (a: NonNullable<typeof acessos>[number]) =>
    a.revogado_em ? "Revogado" : a.valido_ate && new Date(a.valido_ate).getTime() <= agora ? "Expirado" : "Ativo";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Acessos gratuitos</h1>
        <p className="text-sm text-text-2">Família, comunidade e parceiros: tudo liberado pelo tempo que você escolher.</p>
      </header>
      <ConcederAcesso />
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-text-2">
            <tr className="border-b border-border">
              <th className="p-3 font-medium">E-mail</th>
              <th className="p-3 font-medium">Motivo</th>
              <th className="p-3 font-medium">Desde</th>
              <th className="p-3 font-medium">Até</th>
              <th className="p-3 font-medium">Situação</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(acessos ?? []).map((a) => {
              const s = situacao(a);
              return (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    {a.email}
                    {!a.user_id && <span className="block text-xs text-text-3">ainda sem conta</span>}
                  </td>
                  <td className="p-3 text-text-2">{a.motivo || "—"}</td>
                  <td className="p-3 tabular-nums">{data.format(new Date(a.created_at))}</td>
                  <td className="p-3 tabular-nums">{a.valido_ate ? data.format(new Date(a.valido_ate)) : "Sem prazo"}</td>
                  <td className={`p-3 ${s === "Ativo" ? "text-accent-strong" : "text-text-3"}`}>{s}</td>
                  <td className="p-3 text-right">{s === "Ativo" && <BotaoRevogar id={a.id} />}</td>
                </tr>
              );
            })}
            {!acessos?.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-2">
                  Nenhum acesso concedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
