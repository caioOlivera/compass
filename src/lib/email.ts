import "server-only";
import { serverEnv } from "@/lib/env";

// E-mail transacional pelo Resend (https://resend.com), opcional. Sem RESEND_API_KEY nada é enviado
// e o fluxo segue normal: o chamado fica no site e no painel. Nunca derruba quem chamou.

export function emailConfigurado(): boolean {
  return !!serverEnv().RESEND_API_KEY;
}

export async function enviarEmail(p: { para: string; assunto: string; texto: string; responderPara?: string }): Promise<boolean> {
  const { RESEND_API_KEY: chave, EMAIL_REMETENTE: de } = serverEnv();
  if (!chave || !p.para) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: de ?? "Compass <onboarding@resend.dev>",
        to: [p.para],
        subject: p.assunto,
        text: p.texto,
        ...(p.responderPara ? { reply_to: p.responderPara } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email]", res.status, (await res.text().catch(() => "")).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("[email]", e);
    return false;
  }
}
