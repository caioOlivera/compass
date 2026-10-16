import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { caminhoSeguro } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Criar conta — Compass" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function CadastroPage({ searchParams }: Props) {
  const next = caminhoSeguro((await searchParams).next, "/nova-viagem");
  return (
    <AuthShell
      titulo="Criar conta"
      subtitulo="Leva um minuto, e o seu primeiro roteiro é grátis. Depois é só responder o questionário da viagem."
      rodape={
        <>
          Já tem conta?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-accent-strong underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm next={next} />
    </AuthShell>
  );
}
