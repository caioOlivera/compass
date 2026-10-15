import type { ContextoBase } from "@/lib/ai/generate";
import { normalizarNome } from "@/lib/validation/trip-request";

// Parte pura do contexto da base: junta os resultados das várias buscas, tira repetidos e o que o
// viajante quer evitar, e numera como [R1], [R2]... para o modelo citar.

export type Achado = { registro_tipo: string; registro_id: string; texto: string; similaridade: number };
export type MapaRefs = Record<string, { tipo: string; id: string }>;

export const SIMILARIDADE_MINIMA = 0.5;

export function formatarContexto(
  resultados: Achado[][],
  opcoes: { limite?: number; evitar?: string[]; minimo?: number } = {},
): { contexto: ContextoBase; mapa: MapaRefs } {
  const limite = opcoes.limite ?? 45;
  const minimo = opcoes.minimo ?? 0;
  const evitar = (opcoes.evitar ?? []).map(normalizarNome).filter(Boolean);

  const melhores = new Map<string, Achado>();
  for (const lista of resultados) {
    for (const a of lista) {
      if (a.similaridade < minimo) continue;
      const chave = `${a.registro_tipo}:${a.registro_id}`;
      const atual = melhores.get(chave);
      if (!atual || a.similaridade > atual.similaridade) melhores.set(chave, a);
    }
  }

  const escolhidos = [...melhores.values()]
    .filter((a) => {
      const t = ` ${normalizarNome(a.texto)} `;
      return !evitar.some((e) => t.includes(` ${e} `));
    })
    .sort((a, b) => b.similaridade - a.similaridade)
    .slice(0, limite);

  const mapa: MapaRefs = {};
  const linhas = escolhidos.map((a, i) => {
    const ref = `R${i + 1}`;
    mapa[ref] = { tipo: a.registro_tipo, id: a.registro_id };
    return `[${ref}] (${a.registro_tipo}) ${a.texto}`;
  });
  return { contexto: { texto: linhas.join("\n"), refs: Object.keys(mapa) }, mapa };
}

/** Perguntas feitas à base a partir do briefing. */
export function consultasDoPedido(p: {
  auge_da_viagem: string;
  locais_desejados_complementares: string[];
  interesses?: string[];
  orcamento?: string;
}): string[] {
  const lugares = [p.auge_da_viagem, ...p.locais_desejados_complementares].slice(0, 6);
  return [
    p.auge_da_viagem,
    `${p.auge_da_viagem}: o que fazer, onde comer e dicas práticas`,
    ...p.locais_desejados_complementares.slice(0, 5),
    `Como ir entre ${lugares.join(", ")}: trem, ferry, voo, carro`,
    p.interesses?.length ? `${p.interesses.join(", ")} em ${p.auge_da_viagem}` : null,
    p.orcamento === "economico" ? `dicas para economizar em ${p.auge_da_viagem}` : null,
  ].filter((c): c is string => !!c && c.trim().length > 1);
}
