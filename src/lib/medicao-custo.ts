// Cálculo puro do custo de uma chamada de IA pelos tokens.

export type PrecosModelos = Record<string, { entrada: number; saida: number }>;

/** "gemini-3.8-flash @ generativelanguage.googleapis.com" → "gemini-3.8-flash" */
export function nomeModelo(modelo: string): string {
  return modelo.split(" @ ")[0].trim().toLowerCase().replace(/^models\//, "");
}

/** Preço do modelo exato; senão, da chave mais longa que é prefixo dele; senão, "padrao". */
export function precoDoModelo(modelo: string, precos: PrecosModelos): { entrada: number; saida: number } {
  const nome = nomeModelo(modelo);
  if (precos[nome]) return precos[nome];
  const prefixo = Object.keys(precos)
    .filter((k) => k !== "padrao" && nome.startsWith(k.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  return precos[prefixo ?? "padrao"] ?? { entrada: 0, saida: 0 };
}

/** Preços em US$ por 1 milhão de tokens. */
export function custoTokens(
  modelo: string,
  entrada: number,
  saida: number,
  precos: PrecosModelos,
  cambio: number,
): { usd: number; brl: number } {
  const p = precoDoModelo(modelo, precos);
  const usd = (entrada * p.entrada + saida * p.saida) / 1_000_000;
  return { usd, brl: usd * cambio };
}
