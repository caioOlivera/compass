import { BookOpen, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Rodape } from "@/components/landing/fechamento";
import { SiteHeader } from "@/components/landing/site-header";
import { NovoChamado } from "@/components/suporte/formularios";
import { CATEGORIAS_CHAMADO, linkWhatsApp, STATUS_CHAMADO } from "@/lib/contato";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajuda — Compass" };

const quando = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function AjudaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: chamados } = user
    ? await supabase.from("chamados").select("id, assunto, categoria, status, updated_at").order("updated_at", { ascending: false }).limit(30)
    : { data: [] };
  const { data: consultoria } = user
    ? await supabase.from("consultorias").select("id").neq("status", "entregue").limit(1).maybeSingle()
    : { data: null };
  const whats = consultoria ? linkWhatsApp("Olá! Sou cliente da consultoria Compass.") : null;

  return (
    <div className="bg-bg text-text">
      <SiteHeader />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold tracking-tight">Ajuda</h1>
          <p className="text-text-2">Abra um chamado e acompanhe a conversa por aqui. Quando respondermos, você também recebe um aviso por e-mail.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/faq" className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-text-3">
            <BookOpen className="mt-0.5 size-5 text-accent-strong" aria-hidden />
            <span className="flex flex-col gap-1">
              <span className="font-medium">Perguntas frequentes</span>
              <span className="text-sm text-text-2">Roteiros, pagamento, reembolso e agências.</span>
            </span>
          </Link>
          {whats ? (
            <a href={whats} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-2xl border border-accent bg-accent/5 p-5">
              <MessageCircle className="mt-0.5 size-5 text-accent-strong" aria-hidden />
              <span className="flex flex-col gap-1">
                <span className="font-medium">WhatsApp do consultor</span>
                <span className="text-sm text-text-2">Para a sua consultoria: contato direto, 24 horas.</span>
              </span>
            </a>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
              <MessageCircle className="mt-0.5 size-5 text-text-2" aria-hidden />
              <span className="flex flex-col gap-1">
                <span className="font-medium">Consultoria pessoal</span>
                <span className="text-sm text-text-2">
                  Quem contrata fala direto com o consultor pelo WhatsApp, 24 horas.{" "}
                  <Link href="/comprar?produto=consultoria" className="text-accent-strong hover:underline">
                    Saiba mais
                  </Link>
                </span>
              </span>
            </div>
          )}
        </div>

        {user ? (
          <>
            <NovoChamado />
            {!!chamados?.length && (
              <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">Seus chamados</h2>
                <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                  {chamados.map((c) => (
                    <li key={c.id}>
                      <Link href={`/ajuda/${c.id}`} className="flex flex-wrap items-baseline justify-between gap-2 p-4 hover:bg-surface-2">
                        <span className="font-medium">{c.assunto}</span>
                        <span className="text-sm text-text-2">
                          {CATEGORIAS_CHAMADO.find((x) => x.id === c.categoria)?.nome} · {STATUS_CHAMADO[c.status]} · {quando.format(new Date(c.updated_at))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-5 text-text-2">
            Para abrir um chamado,{" "}
            <Link href="/login?next=/ajuda" className="font-medium text-accent-strong hover:underline">
              entre na sua conta
            </Link>
            . Assim a gente já sabe de quais roteiros e pedidos você está falando.
          </p>
        )}
      </main>
      <Rodape creditos={[]} />
    </div>
  );
}
