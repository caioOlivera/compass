"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { EmailSchema, errosPorCampo, LoginSenhaSchema, mensagemErroAuth } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

type Modo = "senha" | "codigo";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("senha");
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);

  const irParaVerificar = (email: string, tipo: "login" | "cadastro") =>
    router.push(`/verificar?${new URLSearchParams({ email, tipo, next })}`);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.currentTarget));
    setErroGeral("");
    const supabase = createClient();

    if (modo === "senha") {
      const r = LoginSenhaSchema.safeParse(dados);
      setErros(errosPorCampo(r));
      if (!r.success) return;
      setEnviando(true);
      const { error } = await supabase.auth.signInWithPassword({ email: r.data.email, password: r.data.senha });
      if (error?.code === "email_not_confirmed") {
        // Conta criada mas nunca confirmada: manda um código novo e segue para a confirmação
        await supabase.auth.resend({ type: "signup", email: r.data.email });
        return irParaVerificar(r.data.email, "cadastro");
      }
      setEnviando(false);
      if (error) return setErroGeral(mensagemErroAuth(error));
      router.replace(next);
      router.refresh();
      return;
    }

    const r = EmailSchema.safeParse(dados.email);
    setErros(r.success ? {} : { email: r.error.issues[0].message });
    if (!r.success) return;
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: r.data,
      // Login por código não cria conta: cadastro exige nome e telefone
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setEnviando(false);
    if (error) return setErroGeral(mensagemErroAuth(error));
    irParaVerificar(r.data, "login");
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Forma de entrar" className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 text-sm">
        {(
          [
            ["senha", "Com senha"],
            ["codigo", "Código por e-mail"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modo === valor}
            onClick={() => {
              setModo(valor);
              setErros({});
              setErroGeral("");
            }}
            className={cn(
              "rounded-md px-3 py-2 font-medium transition",
              modo === valor ? "bg-surface text-text shadow-sm" : "text-text-2 hover:text-text",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required erro={erros.email} />
        {modo === "senha" ? (
          <Field label="Senha" name="senha" type="password" autoComplete="current-password" required erro={erros.senha} />
        ) : (
          <p className="text-sm text-text-2">Enviamos um código de 6 dígitos para o seu e-mail. Sem senha.</p>
        )}
        <FormAlert>{erroGeral}</FormAlert>
        <Button type="submit" carregando={enviando} className="mt-2">
          {modo === "senha" ? "Entrar" : "Enviar código"}
        </Button>
      </form>
    </div>
  );
}
