"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LINKS = [
  { href: "/#regioes", rotulo: "Destinos" },
  { href: "/roteiros-assinados", rotulo: "Roteiros assinados" },
  { href: "/#como-funciona", rotulo: "Como funciona" },
  { href: "/exemplo", rotulo: "Exemplo de roteiro" },
  { href: "/agencias", rotulo: "Para agências" },
  { href: "/faq", rotulo: "Perguntas frequentes" },
  { href: "/ajuda", rotulo: "Ajuda" },
];

/** Menu do site no celular: abre em tela cheia abaixo do topo. */
export function MenuCelular() {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  useEffect(() => setAberto(false), [caminho]);
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls="menu-celular"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        className="flex size-11 items-center justify-center rounded-full text-text-2 hover:bg-surface-2"
      >
        {aberto ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {/* Portal no body: o topo usa backdrop-blur, que prenderia um "fixed" dentro dele */}
      {aberto &&
        createPortal(
        <nav id="menu-celular" aria-label="Menu" className="fixed inset-x-0 top-[61px] bottom-0 z-40 overflow-y-auto bg-bg px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <ul className="flex flex-col divide-y divide-border">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setAberto(false)} className="flex h-14 items-center text-lg">
                  {l.rotulo}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/login" className="mt-6 flex h-12 items-center justify-center rounded-full border border-border font-medium">
            Entrar
          </Link>
          <Link href="/cadastro" className="mt-3 flex h-12 items-center justify-center rounded-full bg-accent font-medium text-accent-contrast">
            Criar meu roteiro grátis
          </Link>
        </nav>,
          document.body,
        )}
    </div>
  );
}
