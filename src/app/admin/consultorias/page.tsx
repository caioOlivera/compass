import { EditorConsultoria } from "@/components/compras/botoes";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

const STATUS: Record<string, string> = {
  aguardando_briefing: "Aguardando briefing",
  nova: "Nova",
  em_andamento: "Em andamento",
  entregue: "Entregue",
};

const CAMPOS: [string, string][] = [
  ["destino", "Destino"],
  ["datas", "Quando"],
  ["pessoas", "Quem vai"],
  ["orcamento", "Orçamento"],
  ["contato", "Contato"],
  ["detalhes", "Detalhes"],
];

export default async function ConsultoriasAdminPage() {
  const db = createAdminClient();
  const { data: lista } = await db.from("consultorias").select("*").order("created_at", { ascending: false }).limit(100);
  const ids = [...new Set((lista ?? []).map((c) => c.user_id))];
  const { data: perfis } = ids.length ? await db.from("profiles").select("id, full_name, phone").in("id", ids) : { data: [] };
  const pessoa = Object.fromEntries((perfis ?? []).map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Consultorias</h1>
        <p className="text-sm text-text-2">Pedidos de consultoria pessoal pagos, com o briefing de cada cliente.</p>
      </header>
      {!lista?.length && <p className="text-text-2">Nenhuma consultoria ainda.</p>}
      {(lista ?? []).map((c) => {
        const b = (c.briefing ?? {}) as Record<string, string>;
        return (
          <article key={c.id} className="grid gap-4 rounded-xl border border-border bg-surface p-5 md:grid-cols-[1fr_18rem]">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-2">
                {data.format(new Date(c.created_at))} · {pessoa[c.user_id]?.full_name || "Sem nome"}
                {pessoa[c.user_id]?.phone ? ` · ${pessoa[c.user_id]?.phone}` : ""} · {STATUS[c.status]}
              </p>
              {c.briefing ? (
                <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
                  {CAMPOS.filter(([k]) => b[k]).map(([k, rotulo]) => (
                    <div key={k} className="contents">
                      <dt className="text-text-2">{rotulo}</dt>
                      <dd className="whitespace-pre-wrap">{b[k]}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-text-2">O cliente ainda não enviou o briefing.</p>
              )}
            </div>
            <EditorConsultoria id={c.id} status={c.status} notas={c.notas ?? ""} />
          </article>
        );
      })}
    </div>
  );
}
