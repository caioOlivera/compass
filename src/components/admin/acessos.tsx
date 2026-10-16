"use client";

import { useState, useTransition } from "react";
import { concederAcesso, revogarAcesso } from "@/app/actions/acessos";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";

const PRAZOS = [
  { rotulo: "30 dias", dias: 30 },
  { rotulo: "90 dias", dias: 90 },
  { rotulo: "1 ano", dias: 365 },
  { rotulo: "Sem prazo", dias: null },
] as const;

export function ConcederAcesso() {
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [prazo, setPrazo] = useState<number | null>(30);
  const [personalizado, setPersonalizado] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const dias = personalizado ? Number(personalizado) : prazo;
  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await concederAcesso({ email, dias, motivo });
          setMsg({ ok: r.ok, texto: r.mensagem });
          if (r.ok) {
            setEmail("");
            setMotivo("");
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold">Conceder acesso gratuito</h2>
      <p className="text-sm text-text-2">Libera tudo: roteiros completos (com passagens e hotéis) e roteiros assinados, sem gastar créditos. Vale para a conta com esse e-mail, mesmo que ela seja criada depois.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Motivo (só para você)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: família, comunidade" />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Por quanto tempo</legend>
        <div className="flex flex-wrap gap-2">
          {PRAZOS.map((p) => (
            <button
              key={p.rotulo}
              type="button"
              onClick={() => {
                setPrazo(p.dias);
                setPersonalizado("");
              }}
              className={`rounded-full border px-3 py-1.5 text-sm ${!personalizado && prazo === p.dias ? "border-accent bg-accent/10 text-accent-strong" : "border-border text-text-2"}`}
            >
              {p.rotulo}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={3650}
            value={personalizado}
            onChange={(e) => setPersonalizado(e.target.value)}
            placeholder="Outro (dias)"
            className="h-9 w-32 rounded-full border border-border bg-bg px-3 text-sm"
          />
        </div>
      </fieldset>
      {msg && <FormAlert tipo={msg.ok ? "info" : "erro"}>{msg.texto}</FormAlert>}
      <Button type="submit" carregando={ocupado} className="self-start">
        Conceder
      </Button>
    </form>
  );
}

export function BotaoRevogar({ id }: { id: string }) {
  const [ocupado, iniciar] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={ocupado}
        className="text-sm text-red-700 hover:underline disabled:opacity-60"
        onClick={() => {
          if (!confirm("Revogar este acesso agora?")) return;
          iniciar(async () => setMsg((await revogarAcesso(id)).mensagem));
        }}
      >
        {ocupado ? "Revogando…" : "Revogar"}
      </button>
      {msg && <span className="text-xs text-text-2">{msg}</span>}
    </span>
  );
}
