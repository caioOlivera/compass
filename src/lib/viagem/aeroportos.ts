// Códigos IATA de cidade (ou do aeroporto principal) das origens brasileiras mais comuns.
// Código de cidade (SAO, RIO, BHZ) cobre todos os aeroportos dela nas buscas.

const ORIGENS: Record<string, string> = {
  "sao paulo": "SAO",
  "rio de janeiro": "RIO",
  brasilia: "BSB",
  "belo horizonte": "BHZ",
  goiania: "GYN",
  curitiba: "CWB",
  "porto alegre": "POA",
  florianopolis: "FLN",
  salvador: "SSA",
  recife: "REC",
  fortaleza: "FOR",
  natal: "NAT",
  maceio: "MCZ",
  "joao pessoa": "JPA",
  aracaju: "AJU",
  teresina: "THE",
  "sao luis": "SLZ",
  belem: "BEL",
  manaus: "MAO",
  cuiaba: "CGB",
  "campo grande": "CGR",
  vitoria: "VIX",
  campinas: "VCP",
  "ribeirao preto": "RAO",
  uberlandia: "UDI",
  londrina: "LDB",
  maringa: "MGF",
  "foz do iguacu": "IGU",
  navegantes: "NVT",
  joinville: "JOI",
  palmas: "PMW",
  "porto velho": "PVH",
  "rio branco": "RBR",
  macapa: "MCP",
  "boa vista": "BVB",
  "sao jose do rio preto": "SJP",
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "São Paulo", "sao paulo - SP", "GRU" → código IATA; null se não reconhecer. */
export function iataDaOrigem(cidade: string): string | null {
  const bruto = cidade.trim();
  if (/^[A-Z]{3}$/.test(bruto)) return bruto;
  const entre = bruto.match(/\(([A-Z]{3})\)/);
  if (entre) return entre[1];
  const nome = semAcento(bruto.split(/[,(\-/]/)[0]);
  return ORIGENS[nome] ?? null;
}

/** Códigos entre parênteses em "Entrada por Roma (FCO) | Saída por Milão (MXP)": [FCO, MXP]. */
export function iatasDoTexto(texto: string): string[] {
  return [...texto.matchAll(/\(([A-Z]{3})\)/g)].map((m) => m[1]);
}

export const IATA = /^[A-Z]{3}$/;
