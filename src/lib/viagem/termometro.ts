// Termômetro de passagens: diz se o preço das "portas" (ida e volta do Brasil, por pessoa,
// econômica) está bom para a região. As faixas ficam no banco (config `termometro_passagens`),
// editáveis sem deploy; aqui só a regra.

export type FaixasTermometro = { unicornio: number; muito_bom: number; bom: number; normal: number; teto: number };
export type RegiaoTermometro = "europa" | "asia" | "eua_canada" | "america_sul_sul" | "america_sul_norte" | "africa";
export type ConfigTermometro = { atualizado?: string } & Partial<Record<RegiaoTermometro, FaixasTermometro>>;

export const NOME_REGIAO: Record<RegiaoTermometro, string> = {
  europa: "a Europa",
  asia: "a Ásia",
  eua_canada: "EUA e Canadá",
  america_sul_sul: "o sul da América do Sul",
  america_sul_norte: "o norte da América do Sul",
  africa: "a África",
};

// Aeroportos de Argentina, Chile e Uruguai (o resto da América do Sul usa a faixa do norte)
const SUL = new Set(["EZE", "AEP", "BUE", "COR", "MDZ", "BRC", "FTE", "USH", "IGR", "SLA", "NQN", "SCL", "PUQ", "CJC", "PMC", "IPC", "MVD", "PDP"]);

const DA_SUBREGIAO: Record<string, RegiaoTermometro | ((iatas: string[]) => RegiaoTermometro)> = {
  europa: "europa",
  "asia-leste": "asia",
  "sudeste-asiatico": "asia",
  "asia-sul": "asia",
  "america-do-norte": "eua_canada",
  "africa-do-norte": "africa",
  "africa-subsaariana": "africa",
  "america-do-sul": (iatas) => (iatas.length && iatas.every((i) => SUL.has(i)) ? "america_sul_sul" : "america_sul_norte"),
};

/**
 * Região do termômetro a partir das regiões escolhidas e dos aeroportos de destino. Em roteiro
 * que cruza regiões, vale a de passagem mais cara (o voo longo é que decide o preço).
 */
export function regiaoDoTermometro(regioes: string[], iatasDestino: string[], config: ConfigTermometro): RegiaoTermometro | null {
  const candidatas = regioes
    .map((r) => DA_SUBREGIAO[r])
    .filter((r) => r !== undefined)
    .map((r) => (typeof r === "function" ? r(iatasDestino) : r))
    .filter((r) => config[r]);
  if (!candidatas.length) return null;
  return candidatas.reduce((a, b) => (config[b]!.normal > config[a]!.normal ? b : a));
}

export type NivelPreco = "unicornio" | "muito_bom" | "bom" | "normal" | "acima" | "caro";

export const ROTULO_NIVEL: Record<NivelPreco, string> = {
  unicornio: "Passagem unicórnio",
  muito_bom: "Muito bom",
  bom: "Bom, abaixo do normal",
  normal: "Normal, preço justo",
  acima: "Acima do normal",
  caro: "Caro: vale esperar baixar",
};

export function nivelDoPreco(total: number, f: FaixasTermometro): NivelPreco {
  if (total <= f.unicornio) return "unicornio";
  if (total <= f.muito_bom) return "muito_bom";
  if (total <= f.bom) return "bom";
  if (total <= f.normal) return "normal";
  if (total <= f.teto) return "acima";
  return "caro";
}

export type AvaliacaoPreco = { nivel: NivelPreco; rotulo: string; total: number; normal: number; regiao: string };

export function avaliarPortas(total: number | null, regioes: string[], iatasDestino: string[], config: ConfigTermometro): AvaliacaoPreco | null {
  if (!total || total <= 0) return null;
  const regiao = regiaoDoTermometro(regioes, iatasDestino, config);
  if (!regiao) return null;
  const f = config[regiao]!;
  const nivel = nivelDoPreco(total, f);
  return { nivel, rotulo: ROTULO_NIVEL[nivel], total, normal: f.normal, regiao: NOME_REGIAO[regiao] };
}
