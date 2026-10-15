"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { CodigoSchema, mensagemErroAuth } from "@/lib/validation/auth";

const ESPERA_REENVIO_S = 60;

export function VerifyForm({ email, tipo, next }: { email: string; tipo: "login" | "cadastro"; next: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(ESPERA_REENVIO_S);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    const r = CodigoSchema.safeParse(codigo);
    if (!r.success) return setErro(r.error.issues[0].message);
    setErro("");
    setEnviando(true);
    // type "email" vale tanto para confirmar cadastro quanto para login por código
    const { error } = await createClient().auth.verifyOtp({ email, token: r.data, type: "email" });
    if (error) {
      setEnviando(false);
      return setErro(mensagemErroAuth(error));
    }
    router.replace(next);
    router.refresh();
  }

  async function reenviar() {
    setErro("");
    setAviso("");
    const supabase = createClient();
    const { error } =
      tipo === "cadastro"
        ? await supabase.auth.resend({ type: "signup", email })
        : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) return setErro(mensagemErroAuth(error));
    setAviso("Enviamos um novo código.");
    setEspera(ESPERA_REENVIO_S);
  }

  return (
    <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
      <label htmlFor="codigo" className="text-sm font-medium">
        Código
      </label>
      <Input
        id="codigo"
        name="codigo"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={12}
        placeholder="000000"
        aria-invalid={!!erro || undefined}
        className="h-14 text-center font-mono text-2xl tracking-[0.4em]"
      />
      <FormAlert>{erro}</FormAlert>
      <FormAlert tipo="info">{aviso}</FormAlert>
      <Button type="submit" carregando={enviando}>
        Confirmar
      </Button>
      <Button type="button" variante="fantasma" onClick={reenviar} disabled={espera > 0}>
        {espera > 0 ? `Reenviar código em ${espera}s` : "Reenviar código"}
      </Button>
    </form>
  );
}
