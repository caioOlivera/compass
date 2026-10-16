import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { FormBriefing } from "@/components/compras/botoes";
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
      </main>
    </>
  );
}
