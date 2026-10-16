import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { MessageCircle } from "lucide-react";
import { FormBriefing } from "@/components/compras/botoes";
import { linkWhatsApp } from "@/lib/contato";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Consultoria — Compass" };

const ANDAMENTO: Record<string, string> = {
  nova: "Recebemos seu briefing. O consultor entra em contato em breve.",
  em_andamento: "O consultor está montando sua viagem.",
  entregue: "Sua consultoria foi entregue. Qualquer dúvida, fale direto com o consultor.",
};

export default async function ConsultoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/consultoria/${id}`);

  // RLS: só o dono (ou admin) lê
  const { data: c } = await supabase.from("consultorias").select("id, status").eq("id", id).maybeSingle();
  if (!c) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Consultoria pessoal</h1>
          <p className="text-text-2">
            {c.status === "aguardando_briefing"
              ? "Conte o máximo que puder sobre a viagem. O consultor lê tudo antes de falar com você."
              : ANDAMENTO[c.status]}
          </p>
        </header>
        {c.status === "aguardando_briefing" && <FormBriefing consultoriaId={c.id} />}
        {c.status !== "entregue" && linkWhatsApp() && (
          <a
            href={linkWhatsApp("Olá! Sou cliente da consultoria Compass.")!}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-2xl border border-accent bg-accent/5 p-5"
          >
            <MessageCircle className="mt-0.5 size-5 text-accent-strong" aria-hidden />
            <span className="flex flex-col gap-1">
              <span className="font-medium">Fale direto com o consultor pelo WhatsApp</span>
              <span className="text-sm text-text-2">Suporte 24 horas, do planejamento até a volta da viagem.</span>
            </span>
          </a>
        )}
      </main>
    </>
  );
}
