import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Painel — Compass", robots: { index: false } };

const LINKS = [
  { href: "/admin/base", rotulo: "Base" },
  { href: "/admin/base/revisao", rotulo: "Revisão" },
  { href: "/admin/base/busca", rotulo: "Busca" },
  { href: "/admin/base/roteiros", rotulo: "Roteiros prontos" },
  { href: "/admin/pedidos", rotulo: "Pedidos" },
  { href: "/admin/acessos", rotulo: "Acessos" },
  { href: "/admin/consultorias", rotulo: "Consultorias" },
  { href: "/admin/suporte", rotulo: "Suporte" },
  { href: "/admin/estudo", rotulo: "Voos e hotéis" },
  { href: "/admin/medicao", rotulo: "Medição" },
  { href: "/admin/config", rotulo: "Configurações" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin/base" />
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-strong">Painel</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-text-2 hover:bg-surface-2 hover:text-text">
                {l.rotulo}
              </Link>
            ))}
            <Link href="/roteiros" className="rounded-md px-3 py-2 text-text-3 hover:text-text">
              Sair do painel
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
