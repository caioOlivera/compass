// Agregações do painel de medição (Fase 6): custo por tipo de chamada, custo médio por consulta
// de cada produto e a margem contra o preço de venda. Pura: recebe as linhas de eventos_uso.

export type LinhaUso = {
  tipo: string;
  produto: string | null;
  user_id: string | null;
  trip_request_id: string | null;
  custo_brl: number;
  input_tokens: number;
  output_tokens: number;
  sucesso: boolean;
  created_at: string;
};

export type ResumoProduto = {
  produto: string;
  consultas: number;
  custoTotal: number;
  custoMedio: number;
  preco: number | null;
  margem: number | null;
  margemPct: number | null;
};

const INICIAIS = new Set(["geracao", "adaptacao"]);

export function resumirUso(linhas: LinhaUso[], precos: Record<string, number>) {
  const custoTotal = linhas.reduce((s, l) => s + Number(l.custo_brl), 0);
  const falhas = linhas.filter((l) => !l.sucesso).length;

  const porTipo = agrupar(linhas, (l) => l.tipo).map(([tipo, ls]) => ({
    tipo,
    n: ls.length,
    custo: soma(ls),
    tokens: ls.reduce((s, l) => s + l.input_tokens + l.output_tokens, 0),
  }));

  // Consulta = um pedido (trip_request); o custo dela soma geração, ajustes e o que mais tiver o mesmo id
  const porConsulta = new Map<string, { produto: string; custo: number }>();
  for (const l of linhas) {
    if (!l.trip_request_id) continue;
    const atual = porConsulta.get(l.trip_request_id) ?? { produto: l.produto ?? "roteiro", custo: 0 };
    atual.custo += Number(l.custo_brl);
    if (INICIAIS.has(l.tipo) && l.produto && atual.produto !== "completo") atual.produto = l.produto;
    // Cotou passagens ou hotéis: a consulta virou "completo"
    if (l.tipo === "busca_voo" || l.tipo === "busca_hotel") atual.produto = "completo";
    porConsulta.set(l.trip_request_id, atual);
  }
  const porProduto: ResumoProduto[] = agrupar([...porConsulta.values()], (c) => c.produto).map(([produto, cs]) => {
    const total = cs.reduce((s, c) => s + c.custo, 0);
    const medio = total / cs.length;
    const preco = precos[produto] ?? null;
    return {
      produto,
      consultas: cs.length,
      custoTotal: total,
      custoMedio: medio,
      preco,
      margem: preco === null ? null : preco - medio,
      margemPct: preco ? ((preco - medio) / preco) * 100 : null,
    };
  });

  const porUsuario = agrupar(
    linhas.filter((l) => l.user_id),
    (l) => l.user_id!,
  )
    .map(([user_id, ls]) => ({ user_id, n: ls.length, custo: soma(ls) }))
    .sort((a, b) => b.custo - a.custo)
    .slice(0, 10);

  const porDia = agrupar(linhas, (l) => l.created_at.slice(0, 10))
    .map(([dia, ls]) => ({ dia, n: ls.length, custo: soma(ls) }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  return { eventos: linhas.length, custoTotal, falhas, porTipo, porProduto, porUsuario, porDia };
}

function soma(ls: LinhaUso[]) {
  return ls.reduce((s, l) => s + Number(l.custo_brl), 0);
}

function agrupar<T>(itens: T[], chave: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const i of itens) {
    const k = chave(i);
    m.set(k, [...(m.get(k) ?? []), i]);
  }
  return [...m.entries()];
}
