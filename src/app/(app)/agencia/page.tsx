import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CriarAgencia, PainelAgencia } from "@/components/agencia/painel-agencia";
import { ContatoSchema, urlDoLogo } from "@/lib/agencia";
import { lerConfig } from "@/lib/configuracoes";
import { planoDoUsuario, saldo } from "@/lib/creditos";
import { formatarPreco } from "@/lib/motor/catalogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minha agência — Compass" };

export default async function AgenciaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agencia");

  const { data: orgId } = await supabase.rpc("minha_organizacao");
  if (!orgId) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">Compass para agências</h1>
          <p className="text-text-2">
            Monte roteiros para os seus clientes e entregue o PDF com a marca da sua agência: logo, cores e contato. Toda a equipe
            usa a mesma conta.
          </p>
          <CriarAgencia />
        </main>
      </>
    );
  }

  const [{ data: org }, { data: membros }, { data: dono }] = await Promise.all([
    supabase.from("organizacoes").select("*").eq("id", orgId).single(),
    supabase.from("organizacao_membros").select("user_id, papel, created_at").eq("organizacao_id", orgId).order("created_at"),
    supabase.rpc("sou_dono_da_organizacao"),
  ]);
  // Nomes dos colegas: perfis só são visíveis ao próprio dono pela RLS, então o servidor busca
  const ids = (membros ?? []).map((m) => m.user_id);
  const { data: perfis } = ids.length ? await createAdminClient().from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const nomes = Object.fromEntries((perfis ?? []).map((p) => [p.id, p.full_name]));
  const ativo = await planoDoUsuario(supabase, user.id);
  const precos = await lerConfig<Record<string, number>>(createAdminClient(), "precos_produtos", {});
  const creditos = ativo?.plano === "basic" ? ((await saldo(supabase, { organizacaoId: orgId })).completo ?? 0) : null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{org?.nome}</h1>
          <p className="text-text-2">
            {ativo?.plano ? `Plano ${ativo.plano === "basic" ? "Basic" : "Premium"}` : "Sem plano ativo"} · {membros?.length ?? 0}{" "}
            {membros?.length === 1 ? "pessoa" : "pessoas"}
          </p>
        </header>
        <PainelAgencia
          orgId={orgId}
          souDono={!!dono}
          eu={user.id}
          marca={{ nome: org?.nome ?? "", cor: org?.cor ?? "#1f6f5c", contato: ContatoSchema.parse(org?.contato ?? {}) }}
          logoUrl={urlDoLogo(org?.logo_path)}
          membros={(membros ?? []).map((m) => ({ id: m.user_id, papel: m.papel, nome: nomes[m.user_id] || "Sem nome" }))}
          plano={ativo?.plano ?? null}
          planoAte={org?.plano_ativo_ate}
          creditosMes={creditos}
          precos={{ basic: formatarPreco(precos.basic ?? 199.9), premium: formatarPreco(precos.premium ?? 399.9) }}
        />
      </main>
    </>
  );
}
