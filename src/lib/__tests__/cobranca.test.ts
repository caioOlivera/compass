import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Banco falso só com o que a cobrança usa: filtros eq/gt/in, insert, update condicional.
type Linha = Record<string, unknown>;
function bancoFalso(inicial: Record<string, Linha[]> = {}) {
  const tabelas: Record<string, Linha[]> = structuredClone(inicial);
  let seq = 0;
  const tabela = (n: string) => (tabelas[n] ??= []);
  function consulta(nome: string) {
    const filtros: ((l: Linha) => boolean)[] = [];
    let acao: { tipo: "select" } | { tipo: "insert"; linhas: Linha[] } | { tipo: "update"; dados: Linha } = { tipo: "select" };
    const executar = () => {
      const t = tabela(nome);
      if (acao.tipo === "insert") {
        if (nome === "webhooks_recebidos" && acao.linhas.some((l) => t.some((x) => x.chave === l.chave))) return { erro: true, linhas: [] };
        const novas = acao.linhas.map((l) => ({ id: `id${++seq}`, created_at: new Date().toISOString(), ...l }));
        t.push(...novas);
        return { erro: false, linhas: novas };
      }
      const achadas = t.filter((l) => filtros.every((f) => f(l)));
      if (acao.tipo === "update") for (const l of achadas) Object.assign(l, acao.dados);
      return { erro: false, linhas: achadas };
    };
    const b = {
      select: () => b,
      eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), b),
      gt: (c: string, v: number) => (filtros.push((l) => Number(l[c]) > v), b),
      in: (c: string, vs: unknown[]) => (filtros.push((l) => vs.includes(l[c])), b),
      insert: (v: Linha | Linha[]) => ((acao = { tipo: "insert", linhas: Array.isArray(v) ? v : [v] }), b),
      update: (dados: Linha) => ((acao = { tipo: "update", dados }), b),
      maybeSingle: async () => ({ data: executar().linhas[0] ?? null, error: null }),
      then: (ok: (v: unknown) => unknown) => {
        const r = executar();
        return Promise.resolve({ data: r.linhas, error: r.erro ? { message: "duplicado" } : null }).then(ok);
      },
    };
    return b;
  }
  return { db: { from: consulta } as never, tabelas };
}

const pagamento = vi.fn();
const autorizado = vi.fn();
vi.mock("@/lib/pagamentos/mercadopago", () => ({
  buscarPagamento: (id: string) => pagamento(id),
  buscarAssinaturaMP: vi.fn(),
  buscarPagamentoAutorizado: (id: string) => autorizado(id),
}));

const config = [
  { chave: "validade_meses_b2c", valor: 12 },
  { chave: "creditos_basic_mes", valor: 30 },
];

describe("pagamento avulso", async () => {
  const { aplicarPagamento } = await import("@/lib/pagamentos/processar");
  const pedido = { id: "p1", user_id: "u1", produto: "roteiro", valor: 9.9, status: "pendente" };

  it("aprovado libera um crédito com validade de 12 meses, uma vez só", async () => {
    const { db, tabelas } = bancoFalso({ configuracoes: config, pedidos: [pedido] });
    const mp = { id: 123, status: "approved", external_reference: "p1", transaction_amount: 9.9, payment_type_id: "bank_transfer" } as const;
    expect(await aplicarPagamento(db, mp)).toBe("pago");
    await aplicarPagamento(db, mp); // aviso repetido
    expect(tabelas.pedidos[0]).toMatchObject({ status: "pago", provedor_id: "123", metodo: "pix" });
    expect(tabelas.creditos).toHaveLength(1);
    expect(tabelas.creditos[0]).toMatchObject({ user_id: "u1", tipo: "roteiro", quantidade: 1, motivo: "compra" });
    const meses = (new Date(tabelas.creditos[0].valido_ate as string).getTime() - Date.now()) / (30.4 * 86_400_000);
    expect(Math.round(meses)).toBe(12);
  });

  it("valor diferente do pedido não libera", async () => {
    const { db, tabelas } = bancoFalso({ configuracoes: config, pedidos: [pedido] });
    expect(await aplicarPagamento(db, { id: 1, status: "approved", external_reference: "p1", transaction_amount: 0.01 })).toBe("ignorado");
    expect(tabelas.pedidos[0].status).toBe("pendente");
    expect(tabelas.creditos ?? []).toHaveLength(0);
  });

  it("consultoria paga abre a ficha aguardando briefing", async () => {
    const { db, tabelas } = bancoFalso({ configuracoes: config, pedidos: [{ ...pedido, produto: "consultoria", valor: 149.9 }] });
    await aplicarPagamento(db, { id: 2, status: "approved", external_reference: "p1", transaction_amount: 149.9 });
    expect(tabelas.consultorias).toEqual([expect.objectContaining({ pedido_id: "p1", user_id: "u1" })]);
  });

  it("recusado cancela o pedido pendente", async () => {
    const { db, tabelas } = bancoFalso({ pedidos: [pedido] });
    expect(await aplicarPagamento(db, { id: 3, status: "rejected", external_reference: "p1", transaction_amount: 9.9 })).toBe("cancelado");
    expect(tabelas.pedidos[0].status).toBe("cancelado");
  });
});

describe("mensalidade das agências", async () => {
  const { processarCobrancaMensal } = await import("@/lib/pagamentos/processar");
  beforeEach(() => autorizado.mockReset());

  it("Basic aprovado estende um mês e entrega 30 créditos; aviso repetido não duplica", async () => {
    const { db, tabelas } = bancoFalso({
      configuracoes: config,
      assinaturas: [{ id: "a1", organizacao_id: "o1", plano: "basic", provedor_id: "pre1", atual_ate: null, status: "pendente" }],
      organizacoes: [{ id: "o1", plano: null, plano_ativo_ate: null }],
    });
    autorizado.mockResolvedValue({ id: 77, preapproval_id: "pre1", status: "processed", payment: { id: 9, status: "approved" } });
    await processarCobrancaMensal(db, "77");
    await processarCobrancaMensal(db, "77");
    expect(tabelas.creditos).toHaveLength(1);
    expect(tabelas.creditos[0]).toMatchObject({ organizacao_id: "o1", tipo: "completo", quantidade: 30, motivo: "plano_mensal" });
    expect(tabelas.organizacoes[0].plano).toBe("basic");
    expect(tabelas.assinaturas[0].status).toBe("ativa");
    expect(new Date(tabelas.organizacoes[0].plano_ativo_ate as string).getTime()).toBeGreaterThan(Date.now() + 27 * 86_400_000);
  });

  it("Premium não recebe créditos (uso justo)", async () => {
    const { db, tabelas } = bancoFalso({
      configuracoes: config,
      assinaturas: [{ id: "a1", organizacao_id: "o1", plano: "premium", provedor_id: "pre1", atual_ate: null }],
      organizacoes: [{ id: "o1" }],
    });
    autorizado.mockResolvedValue({ id: 78, preapproval_id: "pre1", status: "processed", payment: { id: 9, status: "approved" } });
    await processarCobrancaMensal(db, "78");
    expect(tabelas.creditos ?? []).toHaveLength(0);
    expect(tabelas.organizacoes[0].plano).toBe("premium");
  });

  it("cobrança recusada não muda nada", async () => {
    const { db, tabelas } = bancoFalso({ assinaturas: [{ id: "a1", organizacao_id: "o1", plano: "basic", provedor_id: "pre1" }], organizacoes: [{ id: "o1" }] });
    autorizado.mockResolvedValue({ id: 79, preapproval_id: "pre1", status: "recycling", payment: { id: 9, status: "rejected" } });
    await processarCobrancaMensal(db, "79");
    expect(tabelas.creditos ?? []).toHaveLength(0);
    expect(tabelas.organizacoes[0].plano).toBeUndefined();
  });
});
