import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-1 text-sm sm:gap-2">
          <a href="#regioes" className="hidden rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text md:inline">
            Destinos
          </a>
          <a href="#como-funciona" className="hidden rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text md:inline">
            Como funciona
          </a>
          <Link href="/exemplo" className="hidden rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text sm:inline">
            Exemplo
          </Link>
          <Link href="/login" className="rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-accent px-4 py-2 font-medium text-accent-contrast transition hover:opacity-90 active:scale-[0.97]"
          >
            Criar roteiro
          </Link>
        </nav>
      </div>
    </header>
  );
}
