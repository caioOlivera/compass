import Link from "next/link";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/perfil/avatar";
import { urlDoAvatar } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

/** Cabeçalho das telas logadas (roteiros, wizard, perfil). A tela do mapa usa a própria barra lateral. */
export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = user
    ? await supabase.from("profiles").select("full_name, avatar_path").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo href="/roteiros" />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/roteiros" className="rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text">
            Meus roteiros
          </Link>
          <Link href="/nova-viagem" className="rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text">
            Nova viagem
          </Link>
          {user ? (
            <Link
              href="/perfil"
              aria-label="Meu perfil"
              title="Meu perfil"
              className="ml-1 rounded-full transition hover:ring-2 hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Avatar url={urlDoAvatar(perfil?.avatar_path)} nome={perfil?.full_name ?? ""} email={user.email} className="size-9 text-sm" />
            </Link>
          ) : (
            <Link href="/login" className="rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
