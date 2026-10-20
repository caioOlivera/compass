// Revisões sugeridas de roteiros prontos (config `revisao_assinados*`): só o que muda em cada
// roteiro, por id. Aplicadas pelo admin, uma a uma no editor ou todas de uma vez.

export type Deslocamento = { meio: string; de: string; para: string; obs: string | null } | null;
export type DiaRoteiro = { dia: number; cidade: string; atividades: string[]; deslocamento: Deslocamento; obs: string | null };
export type CamposRoteiro = {
  titulo: string;
  auge: string | null;
  resumo: string;
  epoca: string | null;
  essencia: string[];
  paises: string[];
  dias: DiaRoteiro[];
};
export type Revisao = Partial<Omit<CamposRoteiro, "dias">> & { total_dias?: number; dias?: Record<string, Partial<Omit<DiaRoteiro, "dia">>> };



/** Junta os dias atuais com os da revisão; a revisão pode ter mais dias (ou menos, com total_dias). */
export const diaVazio = (dia: number): DiaRoteiro => ({ dia, cidade: "", atividades: [], deslocamento: null, obs: null });

export function diasDaRevisao(atuais: DiaRoteiro[], revisao: Revisao): DiaRoteiro[] {
  const chaves = Object.keys(revisao.dias ?? {}).map(Number);
  const total = revisao.total_dias ?? Math.max(atuais.length, ...chaves);
  return Array.from({ length: total }, (_, i) => {
    const base = atuais.find((d) => d.dia === i + 1) ?? diaVazio(i + 1);
    return { ...base, ...(revisao.dias?.[String(i + 1)] ?? {}), dia: i + 1 };
  });
}

export function aplicarRevisao(atual: CamposRoteiro, r: Revisao): CamposRoteiro {
  return {
    titulo: r.titulo ?? atual.titulo,
    auge: r.auge ?? atual.auge,
    resumo: r.resumo ?? atual.resumo,
    epoca: r.epoca ?? atual.epoca,
    essencia: r.essencia ?? atual.essencia,
    paises: r.paises ?? atual.paises,
    dias: diasDaRevisao(atual.dias, r),
  };
}

/**
 * Junta as várias chaves de revisão (as mais novas, em ordem alfabética, por cima) e diz quais
 * ainda não foram aplicadas a cada roteiro.
 */
export function revisoesPendentes(
  configs: { chave: string; valor: unknown }[],
  aplicadas: Record<string, string[]>,
): { revisoes: Record<string, Revisao>; pendentes: string[] } {
  const revisoes: Record<string, Revisao> = {};
  const chavesPorId: Record<string, string[]> = {};
  for (const c of [...configs].sort((a, b) => a.chave.localeCompare(b.chave))) {
    for (const [id, rev] of Object.entries((c.valor ?? {}) as Record<string, Revisao>)) {
      revisoes[id] = { ...revisoes[id], ...rev };
      (chavesPorId[id] ??= []).push(c.chave);
    }
  }
  const pendentes = Object.keys(chavesPorId).filter((id) => chavesPorId[id].some((ch) => !(aplicadas[id] ?? []).includes(ch)));
  return { revisoes, pendentes };
}
