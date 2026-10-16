import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Wizard } from "@/components/wizard/wizard";
import { opcoesDeGeracao, type OpcoesGeracao } from "@/lib/creditos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inicioDaUrl } from "@/lib/wizard";

export const metadata: Metadata = { title: "Nova viagem — Compass" };

// Acesso protegido pelo proxy.ts; a API confere a sessão e o crédito de novo ao gerar.
export default async function NovaViagemPage({
  searchParams,
}: {
  searchParams: Promise<{ regiao?: string | string[]; auge?: string | string[]; produto?: string }>;
}) {
  const params = await searchParams;
  const inicio = inicioDaUrl(params);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // O que a pessoa pode gerar: decide se a última etapa mostra a escolha entre roteiro e completo
  let opcoes: OpcoesGeracao | null = null;
  if (user) {
    try {
      opcoes = await opcoesDeGeracao(createAdminClient(), user.id, user.email);
    } catch (e) {
      console.error("[nova-viagem] opcoes", e);
    }
  }
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <Wizard inicio={inicio} opcoes={opcoes} produtoInicial={params.produto === "completo" ? "completo" : undefined} />
      </main>
    </>
  );
}
