import { LogOut, Map } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sair } from "@/app/actions/auth";
import { AppHeader } from "@/components/app-header";
import { PerfilForm } from "@/components/perfil/perfil-form";
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

  const [{ data: perfil }, { count }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, avatar_path").eq("id", user.id).maybeSingle(),
    supabase.from("generated_itineraries").select("id", { count: "exact", head: true }),
  ]);

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
