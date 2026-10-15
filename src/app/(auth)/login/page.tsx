import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { FormAlert } from "@/components/ui/field";
import { caminhoSeguro } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Entrar — Compass" };

type Props = { searchParams: Promise<{ next?: string; erro?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = caminhoSeguro(params.next);
  return (
    <AuthShell
      titulo="Entrar"
      subtitulo="Seus roteiros ficam salvos na sua conta."
      rodape={
        <>
          Ainda não tem conta?{" "}
          <Link href={`/cadastro?next=${encodeURIComponent(next)}`} className="font-medium text-accent-strong underline">
            Criar conta
          </Link>
        </>
      }
    >
      {params.erro === "link" && (
        <FormAlert>O link expirou ou foi aberto em outro navegador. Entre com a senha ou peça um código.</FormAlert>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}
