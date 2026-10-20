// Escolha de cookies guardada no navegador. "aceito": cookies de parceiros (links de afiliado);
// "essenciais": só o necessário para a conta funcionar. A escolha vale por 12 meses.
export type Escolha = "aceito" | "essenciais";

const CHAVE = "compass-cookies";
const EVENTO = "compass:cookies";
const VALIDADE = 365 * 86_400_000;

export function lerEscolha(): Escolha | null {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as { e: Escolha; em: number } | null;
    if (!bruto || Date.now() - bruto.em > VALIDADE) return null;
    return bruto.e === "aceito" || bruto.e === "essenciais" ? bruto.e : null;
  } catch {
    return null;
  }
}

export function gravarEscolha(e: Escolha | null) {
  try {
    if (e) localStorage.setItem(CHAVE, JSON.stringify({ e, em: Date.now() }));
    else localStorage.removeItem(CHAVE);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function aoMudarEscolha(fn: () => void) {
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
}
