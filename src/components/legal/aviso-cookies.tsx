"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aoMudarEscolha, gravarEscolha, lerEscolha } from "@/lib/consentimento";

/** Aviso de cookies: aparece até a pessoa escolher, e de novo em "Preferências de cookies". */
export function AvisoCookies() {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const ver = () => setAberto(lerEscolha() === null);
    ver();
    return aoMudarEscolha(ver);
  }, []);
  if (!aberto) return null;
  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm shadow-lg sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-text-2">
        Usamos cookies essenciais para a sua conta funcionar. Com a sua permissão, também os de parceiros de viagem, que
        registram quando você compra por um link nosso.{" "}
        <Link href="/privacidade#cookies" className="text-accent-strong hover:underline">
          Saiba mais
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={() => gravarEscolha("essenciais")} className="h-11 rounded-lg border border-border px-3 font-medium hover:bg-surface-2">
          Só essenciais
        </button>
        <button type="button" onClick={() => gravarEscolha("aceito")} className="h-11 rounded-lg bg-accent px-3 font-medium text-accent-contrast hover:opacity-90">
          Aceitar
        </button>
      </div>
    </div>
  );
}

/** Link do rodapé que reabre o aviso. */
export function PreferenciasCookies({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => gravarEscolha(null)} className={className}>
      Preferências de cookies
    </button>
  );
}

/** Carrega o script de parceiros só depois do aceite (e o tira da página se a pessoa voltar atrás). */
export function ScriptComConsentimento({ src }: { src: string }) {
  const [aceito, setAceito] = useState(false);
  useEffect(() => {
    const ver = () => setAceito(lerEscolha() === "aceito");
    ver();
    return aoMudarEscolha(ver);
  }, []);
  useEffect(() => {
    if (!aceito) return;
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.cmpAb = "2";
    s.dataset.noptimize = "1";
    s.dataset.cfasync = "false";
    document.head.appendChild(s);
    return () => s.remove();
  }, [aceito, src]);
  return null;
}
