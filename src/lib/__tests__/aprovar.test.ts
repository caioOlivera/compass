import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Banco falso: só o pedaço do cliente do Supabase que a aprovação usa, sobre tabelas em memória.
type Linha = Record<string, unknown>;
function bancoFalso() {
  const tabelas: Record<string, Linha[]> = {};
  let seq = 0;
  const tabela = (n: string) => (tabelas[n] ??= []);

  function consulta(nome: string) {
    const filtros: ((l: Linha) => boolean)[] = [];
    let limite = Infinity;
    let acao: { tipo: "select" } | { tipo: "insert"; linhas: Linha[] } | { tipo: "update"; dados: Linha } | { tipo: "upsert"; linha: Linha; conflito: string[] } = { tipo: "select" };
    const executar = () => {
      const t = tabela(nome);
      if (acao.tipo === "insert") {
        const novas = acao.linhas.map((l) => ({ id: `id${++seq}`, mencoes: 1, status: "aprovado", tags: [], ...l }));
        t.push(...novas);
        return novas;
      }
      if (acao.tipo === "upsert") {
        const { linha, conflito } = acao;
        const existe = t.find((l) => conflito.every((c) => l[c] === linha[c]));
        if (!existe) t.push({ id: `id${++seq}`, ...linha });
        return [];
      }
      const achadas = t.filter((l) => filtros.every((f) => f(l))).slice(0, limite);
      if (acao.tipo === "update") for (const l of achadas) Object.assign(l, acao.dados);
      return achadas;
    };
    const b = {
      select: () => b,
      eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), b),
      neq: (c: string, v: unknown) => (filtros.push((l) => l[c] !== v), b),
      in: (c: string, vs: unknown[]) => (filtros.push((l) => vs.includes(l[c])), b),
      limit: (n: number) => ((limite = n), b),
      insert: (v: Linha | Linha[]) => ((acao = { tipo: "insert", linhas: Array.isArray(v) ? v : [v] }), b),
      update: (dados: Linha) => ((acao = { tipo: "update", dados }), b),
      upsert: (linha: Linha, o: { onConflict: string }) => ((acao = { tipo: "upsert", linha, conflito: o.onConflict.split(",") }), b),
      maybeSingle: async () => ({ data: executar()[0] ?? null, error: null }),
      single: async () => {
        const r = executar();
        return r[0] ? { data: r[0], error: null } : { data: null, error: { message: "nenhuma linha" } };
      },
      then: (ok: (v: { data: Linha[]; error: null }) => unknown) => Promise.resolve({ data: executar(), error: null }).then(ok),
    };
    return b;
  }
  return { db: { from: consulta } as never, tabelas };
}

const fonte = { id: "f1", autoria: "terceiro", tipo: "relato_comunidade", viagem_mes: "2023-01" };
const lugar = {
  destino: "Krabi",
  pais_codigo: "TH",
  nome: "Tiger Cave Temple",
  tipo: "atracao",
  tags: ["vista"],
  resumo: "1.260 degraus com vista.",
  tempo_visita_min: null,
  custo: null,
  reservar_antes: null,
  melhor_horario: null,
  veredito: "neutro",
  citacao: "subir os 1260 degraus",
};

describe("aprovarItem", async () => {
  const { aprovarItem } = await import("@/lib/conhecimento/aprovar");

  it("lugar novo cria o país, a cidade, o lugar, a citação e o texto de busca", async () => {
    const { db, tabelas } = bancoFalso();
    const id = await aprovarItem(db, { tipo: "lugar", dados: lugar }, fonte);
    expect(tabelas.destinos.map((d) => [d.tipo, d.nome])).toEqual([
      ["pais", "Tailândia"],
      ["cidade", "Krabi"],
    ]);
    expect(tabelas.destinos[1].pai_id).toBe(tabelas.destinos[0].id);
    expect(tabelas.lugares).toHaveLength(1);
    expect(tabelas.citacoes[0]).toMatchObject({ fonte_id: "f1", registro_tipo: "lugar", registro_id: id });
    expect(tabelas.conhecimento_busca[0]).toMatchObject({ registro_tipo: "lugar", pais_codigo: "TH" });
  });

  it("mesmo lugar de outra fonte mescla: soma menção, completa campos e adota opinião clara", async () => {
    const { db, tabelas } = bancoFalso();
    const a = await aprovarItem(db, { tipo: "lugar", dados: lugar }, fonte);
    const b = await aprovarItem(
      db,
      { tipo: "lugar", dados: { ...lugar, nome: "tiger cave temple", tempo_visita_min: 90, veredito: "recomendado", tags: ["trilha"] } },
      { ...fonte, id: "f2" },
    );
    expect(b).toBe(a);
    expect(tabelas.lugares).toHaveLength(1);
    expect(tabelas.lugares[0]).toMatchObject({ mencoes: 2, tempo_visita_min: 90, veredito: "recomendado", tags: ["vista", "trilha"] });
    expect(tabelas.citacoes).toHaveLength(2);
    expect(tabelas.destinos).toHaveLength(2);
  });

  it("trecho liga duas cidades e dica sem repetir texto", async () => {
    const { db, tabelas } = bancoFalso();
    await aprovarItem(
      db,
      {
        tipo: "trecho",
        dados: {
          origem: "Phi Phi",
          destino: "Krabi",
          pais_codigo_origem: "TH",
          pais_codigo_destino: "TH",
          meio: "ferry",
          duracao_min: 90,
          custo: null,
          operador: null,
          obs: null,
          citacao: "Phi Phi → Krabi (ferry)",
        },
      },
      fonte,
    );
    expect(tabelas.trechos).toHaveLength(1);
    expect(tabelas.destinos.filter((d) => d.tipo === "cidade")).toHaveLength(2);
    const dica = { destino: "Tailândia", pais_codigo: "TH", lugar: null, categoria: "transporte", texto: "Use o metrô em Bangkok.", citacao: "transporte publico" };
    const d1 = await aprovarItem(db, { tipo: "dica", dados: dica }, fonte);
    const d2 = await aprovarItem(db, { tipo: "dica", dados: dica }, fonte);
    expect(d2).toBe(d1);
    // Dica do país fica no país, não cria cidade "Tailândia"
    expect(tabelas.dicas[0].destino_id).toBe(tabelas.destinos.find((d) => d.tipo === "pais")!.id);
    expect(tabelas.dicas[0].ano_ref).toBe(2023);
  });

  it("roteiro próprio vira assinado, com um dia por linha e países", async () => {
    const { db, tabelas } = bancoFalso();
    const dia = (n: number, cidade: string, pais: string) => ({
      dia: n,
      cidade,
      pais_codigo: pais,
      pernoite: cidade,
      atividades: [],
      deslocamento: null,
      obs: null,
    });
    await aprovarItem(
      db,
      {
        tipo: "roteiro",
        dados: {
          titulo: "Qatar + Tailândia",
          duracao_dias: 3,
          resumo: "Teste",
          epoca: null,
          essencia: ["stopover"],
          dias: [dia(1, "Doha", "QA"), dia(2, "Phuket", "TH"), dia(3, "Phuket", "TH")],
        },
      },
      { id: "f3", autoria: "propria", tipo: "roteiro_proprio", viagem_mes: null },
    );
    expect(tabelas.roteiros_base[0]).toMatchObject({ assinado: true, autoria: "propria", paises: ["QA", "TH"] });
    expect(tabelas.roteiro_base_dias).toHaveLength(3);
  });

  it("dados inválidos não gravam nada", async () => {
    const { db, tabelas } = bancoFalso();
    await expect(aprovarItem(db, { tipo: "lugar", dados: { ...lugar, pais_codigo: "Tailândia" } }, fonte)).rejects.toThrow(/pais_codigo/);
    expect(tabelas.lugares).toBeUndefined();
  });
});
