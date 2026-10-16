import { ResponderChamado } from "@/components/suporte/formularios";
import { CATEGORIAS_CHAMADO, STATUS_CHAMADO } from "@/lib/contato";
import { emailConfigurado } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const quando = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function SuporteAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "aberto" } = await searchParams;
  const db = createAdminClient();
  let q = db.from("chamados").select("*, chamado_mensagens(id, autor, texto, created_at)").order("updated_at", { ascending: false }).limit(100);
  if (status !== "todos") q = q.eq("status", status);
  const { data: chamados } = await q;
  const ids = [...new Set((chamados ?? []).map((c) => c.user_id))];
  const { data: perfis } = ids.length ? await db.from("profiles").select("id, full_name, phone").in("id", ids) : { data: [] };
  const pessoa = Object.fromEntries((perfis ?? []).map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
        <p className="text-sm text-text-2">
          {emailConfigurado()
            ? `Avisos por e-mail ligados${serverEnv().SUPORTE_EMAIL ? ` (chamados novos chegam em ${serverEnv().SUPORTE_EMAIL})` : ", mas falta SUPORTE_EMAIL para receber os chamados novos"}.`
            : "Avisos por e-mail desligados: configure RESEND_API_KEY e SUPORTE_EMAIL. Enquanto isso, os chamados aparecem só aqui."}
        </p>
        <nav className="flex gap-1 text-sm">
          {["aberto", "respondido", "fechado", "todos"].map((s) => (
            <a key={s} href={`/admin/suporte?status=${s}`} className={cn("rounded-full border px-3 py-1", s === status ? "border-accent bg-accent/10 text-accent-strong" : "border-border text-text-2")}>
              {s === "todos" ? "Todos" : STATUS_CHAMADO[s]}
            </a>
          ))}
        </nav>
      </header>
      {!chamados?.length && <p className="text-text-2">Nenhum chamado aqui.</p>}
      {(chamados ?? []).map((c) => {
        const msgs = [...(c.chamado_mensagens ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
        return (
          <article key={c.id} id={c.id} className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{c.assunto}</h2>
              <span className="text-sm text-text-2">
                {pessoa[c.user_id]?.full_name || "Sem nome"}
                {pessoa[c.user_id]?.phone ? ` · ${pessoa[c.user_id]?.phone}` : ""} · {CATEGORIAS_CHAMADO.find((x) => x.id === c.categoria)?.nome} ·{" "}
                {STATUS_CHAMADO[c.status]}
              </span>
            </div>
            <ol className="flex flex-col gap-2 text-sm">
              {msgs.map((m) => (
                <li key={m.id} className={cn("rounded-lg p-3", m.autor === "equipe" ? "bg-accent/10" : "bg-bg")}>
                  <span className="text-xs text-text-3">
                    {m.autor === "equipe" ? "Equipe" : "Cliente"} · {quando.format(new Date(m.created_at))}
                  </span>
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                </li>
              ))}
            </ol>
            {c.status !== "fechado" && <ResponderChamado id={c.id} equipe aberto />}
          </article>
        );
      })}
    </div>
  );
}
