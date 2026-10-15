import { LogOut } from "lucide-react";
import Link from "next/link";
import { sair } from "@/app/actions/auth";

/** Cabeçalho das telas logadas (lista de roteiros e wizard). A tela do mapa usa a própria barra lateral. */
export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/roteiros" className="w-fit text-[28px] leading-none font-normal tracking-[-0.045em] text-text">
          compass
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/roteiros" className="rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text">
            Meus roteiros
          </Link>
          <Link href="/nova-viagem" className="rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text">
            Nova viagem
          </Link>
          <form action={sair}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
