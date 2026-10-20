import { ScriptComConsentimento } from "@/components/legal/aviso-cookies";

// Script "Drive" da Travelpayouts (verificação do site e links de afiliado automáticos).
// O endereço não é segredo (aparece em toda página), mas pode ser trocado por TRAVELPAYOUTS_DRIVE_URL.
// Grava cookies de parceiro: só carrega depois do aceite no aviso de cookies (LGPD), e nunca em login, conta ou pagamento.
const DRIVE_PADRAO = "https://emrldtp.com/NTg2NTI5.js?t=586529";

export function urlDoScriptAfiliados(): string | null {
  const src = process.env.TRAVELPAYOUTS_DRIVE_URL || DRIVE_PADRAO;
  return /^https:\/\/[a-z0-9.-]+\/[\w./-]+(\?[\w=&.-]*)?$/i.test(src) ? src : null;
}

// Páginas privadas: o script não carrega nelas
const PRIVADAS = "^/(login|cadastro|verificar|perfil|comprar|pedidos|admin|agencia(/|$)|nova-viagem|roteiros/|consultoria|ajuda/)";

/**
 * Trecho que a Travelpayouts pede no <head> de todas as páginas, com a checagem do aceite antes de criar o script.
 * Fica no HTML do servidor para o verificador do Drive encontrar o código.
 */
export function TrechoDriveNoHead() {
  const src = urlDoScriptAfiliados();
  if (!src) return null;
  const codigo = `(function () {
  try {
    var c = JSON.parse(localStorage.getItem("compass-cookies") || "null");
    if (!c || c.e !== "aceito" || Date.now() - c.em > 31536000000) return;
  } catch (e) { return; }
  if (new RegExp(${JSON.stringify(PRIVADAS)}).test(location.pathname)) return;
  var script = document.createElement("script");
  script.async = 1;
  script.setAttribute("data-cmp-ab", "2");
  script.src = ${JSON.stringify(src)};
  document.head.appendChild(script);
})();`;
  return <script data-noptimize="1" data-cfasync="false" data-cmp-ab="2" dangerouslySetInnerHTML={{ __html: codigo }} />;
}

/** Nas páginas públicas: carrega o script na hora em que a pessoa aceita, sem precisar recarregar. */
export function ScriptAfiliados() {
  const src = urlDoScriptAfiliados();
  return src ? <ScriptComConsentimento src={src} /> : null;
}
