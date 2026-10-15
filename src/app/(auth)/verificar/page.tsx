import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyForm } from "@/components/auth/verify-form";
import { caminhoSeguro, EmailSchema } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Confirme o código — Compass" };

type Props = { searchParams: Promise<{ email?: string; tipo?: string; next?: string }> };

export default async function VerificarPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = EmailSchema.safeParse(params.email ?? "");
  if (!email.success) redirect("/login");
  const tipo = params.tipo === "cadastro" ? "cadastro" : "login";
  const next = caminhoSeguro(params.next);

  return (
    <AuthShell
      titulo="Confira seu e-mail"
      subtitulo={
        <>
          Enviamos um código para <strong className="text-text">{email.data}</strong>. Ele vale por alguns minutos.
          {tipo === "cadastro" && " Também dá para clicar no link do e-mail."}
        </>
      }
    >
      <VerifyForm email={email.data} tipo={tipo} next={next} />
    </AuthShell>
  );
}
