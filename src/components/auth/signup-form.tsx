"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { CadastroSchema, errosPorCampo, mensagemErroAuth } from "@/lib/validation/auth";

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.currentTarget));
    const r = CadastroSchema.safeParse(dados);
    setErros(errosPorCampo(r));
    setErroGeral("");
    if (!r.success) return;

    setEnviando(true);
    const { data, error } = await createClient().auth.signUp({
      email: r.data.email,
      password: r.data.senha,
      options: {
        // Vai para auth.users.raw_user_meta_data; o trigger handle_new_user cria o profile
        data: { full_name: r.data.nome, phone: r.data.telefone },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setEnviando(false);

    if (error) return setErroGeral(mensagemErroAuth(error));
    // Com confirmação de e-mail ligada, e-mail já cadastrado volta sem erro e sem identidades
    if (data.user && data.user.identities?.length === 0) return setErroGeral(mensagemErroAuth({ code: "user_already_exists" }));
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    router.push(`/verificar?${new URLSearchParams({ email: r.data.email, tipo: "cadastro", next })}`);
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <Field label="Nome completo" name="nome" autoComplete="name" required erro={erros.nome} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required erro={erros.email} />
      <Field
        label="Telefone"
        name="telefone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="(21) 99999-0000"
        required
        erro={erros.telefone}
      />
      <Field
        label="Senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        required
        dica="Pelo menos 8 caracteres"
        erro={erros.senha}
      />
      <FormAlert>{erroGeral}</FormAlert>
      <Button type="submit" carregando={enviando} className="mt-2">
        Criar conta
      </Button>
    </form>
  );
}
