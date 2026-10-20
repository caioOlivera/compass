import { ScriptComConsentimento } from "@/components/legal/aviso-cookies";

// Script "Drive" da Travelpayouts (verificação do site e links de afiliado automáticos).
// Só nas páginas públicas: nunca em login, conta ou pagamento. Liga com TRAVELPAYOUTS_DRIVE_URL.
// Grava cookies de parceiro: só entra depois do aceite no aviso de cookies (LGPD).
export function ScriptAfiliados() {
  const src = urlDoScriptAfiliados();
  return src ? <ScriptComConsentimento src={src} /> : null;
}

export function urlDoScriptAfiliados(): string | null {
  const src = process.env.TRAVELPAYOUTS_DRIVE_URL;
  return src && /^https:\/\/[a-z0-9.-]+\/[\w./-]+(\?[\w=&.-]*)?$/i.test(src) ? src : null;
}
