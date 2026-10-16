import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { ResponderChamado } from "@/components/suporte/formularios";
import { STATUS_CHAMADO } from "@/lib/contato";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Chamado — Compass" };

const quando = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function ChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/ajuda/${id}`);

  // RLS: só o dono (ou admin) lê
  const [{ data: c }, { data: mensagens }] = await Promise.all([
    supabase.from("chamados").select("id, assunto, status, created_at").eq("id", id).maybeSingle(),
    supabase.from("chamado_mensagens").select("id, autor, texto, created_at").eq("chamado_id", id).order("created_at"),
  ]);
  if (!c) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
        <Link href="/ajuda" className="text-sm text-text-2 hover:text-text">
          ← Ajuda
        </Link>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{c.assunto}</h1>
          <p className="text-sm text-text-2">{STATUS_CHAMADO[c.status]}</p>
        </header>
        <ol className="flex flex-col gap-3">
          {(mensagens ?? []).map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex max-w-[90%] flex-col gap-1 rounded-2xl p-4 text-sm",
                m.autor === "equipe" ? "self-start border border-border bg-surface" : "self-end bg-accent/10",
              )}
            >
              <span className="text-xs text-text-3">
                {m.autor === "equipe" ? "Compass" : "Você"} · {quando.format(new Date(m.created_at))}
              </span>
              <p className="whitespace-pre-wrap">{m.texto}</p>
            </li>
          ))}
        </ol>
        <ResponderChamado id={c.id} aberto={c.status !== "fechado"} />
      </main>
    </>
  );
}
