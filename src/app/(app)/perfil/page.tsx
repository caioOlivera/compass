import { LogOut, Map } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/actions/auth";
import { AppHeader } from "@/components/app-header";
import { PerfilForm } from "@/components/perfil/perfil-form";
import { NOME_STATUS_PEDIDO, PRODUTOS, saldo, type ProdutoAvulso } from "@/lib/creditos";
import { formatarPreco } from "@/lib/motor/catalogo";
import { urlDoAvatar } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meu perfil — Compass" };

const mesAno = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const [{ data: perfil }, { count }, meu, { data: pedidos }, { data: consultorias }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, avatar_path").eq("id", user.id).maybeSingle(),
    supabase.from("generated_itineraries").select("id", { count: "exact", head: true }),
    saldo(supabase, { userId: user.id }),
    supabase.from("pedidos").select("id, produto, valor, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("consultorias").select("id, status").eq("user_id", user.id),
  ]);
  const tipos = (Object.keys(PRODUTOS) as ProdutoAvulso[]).filter((t) => meu[t]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Meu perfil</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-2">
            <span>Na Compass desde {mesAno.format(new Date(user.created_at))}</span>
            <Link href="/roteiros" className="inline-flex items-center gap-1.5 hover:text-text">
              <Map className="size-4" aria-hidden />
              {count ?? 0} {count === 1 ? "roteiro" : "roteiros"}
            </Link>
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <PerfilForm
            uid={user.id}
            email={user.email ?? ""}
            nome={perfil?.full_name ?? ""}
            telefone={perfil?.phone ?? ""}
            avatarUrl={urlDoAvatar(perfil?.avatar_path)}
          />
        </div>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-medium">Créditos</h2>
            <Link href="/comprar" className="text-sm font-medium text-accent-strong hover:underline">
              Comprar
            </Link>
          </div>
          <p className="text-sm text-text-2">
            {tipos.length ? tipos.map((t) => `${meu[t]} ${PRODUTOS[t].titulo.toLowerCase()}`).join(" · ") : "Nenhum crédito disponível."}
          </p>
          {consultorias?.some((c) => c.status === "aguardando_briefing") && (
            <Link href={`/consultoria/${consultorias.find((c) => c.status === "aguardando_briefing")!.id}`} className="text-sm font-medium text-accent-strong hover:underline">
              Preencher o briefing da sua consultoria
            </Link>
          )}
          {!!pedidos?.length && (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {pedidos.map((p) => (
                <li key={p.id}>
                  <Link href={`/pedidos/${p.id}`} className="flex justify-between gap-3 py-2 hover:text-accent-strong">
                    <span>
                      {PRODUTOS[p.produto as ProdutoAvulso]?.titulo ?? p.produto} · {formatarPreco(Number(p.valor))}
                    </span>
                    <span className="text-text-2">{NOME_STATUS_PEDIDO[p.status] ?? p.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/agencia"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition hover:border-text-3"
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">Minha agência</span>
            <span className="text-sm text-text-2">Equipe, marca no PDF e planos para agências.</span>
          </span>
          <span aria-hidden className="text-accent-strong">→</span>
        </Link>

        <form action={sair}>
          <button type="submit" className="inline-flex items-center gap-2 text-sm text-text-2 hover:text-text">
            <LogOut className="size-4" aria-hidden />
            Sair da conta
          </button>
        </form>
      </main>
    </>
  );
}
