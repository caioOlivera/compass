import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/validation/auth";

// Destino dos links dos e-mails do Supabase (confirmação de cadastro, login por link).
// Aceita os dois formatos: ?code= (PKCE, template padrão) e ?token_hash=&type= (template customizado).
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = caminhoSeguro(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Link sem código") };

  if (error) {
    // Link aberto em outro navegador (PKCE) ou expirado: o código de 6 dígitos ainda resolve
    return NextResponse.redirect(new URL(`/login?erro=link&next=${encodeURIComponent(next)}`, url));
  }
  return NextResponse.redirect(new URL(next, url));
}
