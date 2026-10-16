import { describe, expect, it } from "vitest";
import { custoTokens, nomeModelo, precoDoModelo } from "@/lib/medicao-custo";
import { consultasDoPedido, formatarContexto } from "@/lib/motor/contexto-formato";

const achado = (id: string, sim: number, texto = `texto ${id}`, tipo = "lugar") => ({
  registro_tipo: tipo,
  registro_id: id,
  texto,
  similaridade: sim,
});

describe("contexto da base", () => {
  it("junta buscas, fica com a maior similaridade, ordena e numera", () => {
    const { contexto, mapa } = formatarContexto([[achado("a", 0.6), achado("b", 0.9)], [achado("a", 0.8), achado("c", 0.4)]], { minimo: 0.5 });
    expect(contexto.refs).toEqual(["R1", "R2"]);
    expect(mapa.R1).toEqual({ tipo: "lugar", id: "b" });
    expect(mapa.R2).toEqual({ tipo: "lugar", id: "a" });
    expect(contexto.texto).toBe("[R1] (lugar) texto b\n[R2] (lugar) texto a");
  });

  it("tira o que o viajante quer evitar e respeita o limite", () => {
    const r = formatarContexto([[achado("v", 0.9, "Gôndola em Veneza, Itália."), achado("x", 0.8), achado("y", 0.7)]], {
      evitar: ["Veneza"],
      limite: 1,
    });
    expect(r.contexto.texto).toBe("[R1] (lugar) texto x");
  });

  it("base vazia vira contexto vazio", () => {
    expect(formatarContexto([[], []]).contexto).toEqual({ texto: "", refs: [] });
  });

  it("consultas saem do auge, locais, interesses e orçamento", () => {
    const c = consultasDoPedido({
      auge_da_viagem: "Chiang Mai",
      locais_desejados_complementares: ["Phi Phi", "Seul"],
      interesses: ["Gastronomia"],
      orcamento: "economico",
    });
    expect(c[0]).toBe("Chiang Mai");
    expect(c).toContain("Phi Phi");
    expect(c.some((x) => x.startsWith("Como ir entre Chiang Mai, Phi Phi, Seul"))).toBe(true);
    expect(c).toContain("Gastronomia em Chiang Mai");
    expect(c).toContain("dicas para economizar em Chiang Mai");
  });
});

describe("custo por tokens", () => {
  const precos = { padrao: { entrada: 1, saida: 2 }, "gemini-3.8-flash": { entrada: 0.3, saida: 2.5 }, gemini: { entrada: 9, saida: 9 } };

  it("acha o preço exato, por prefixo mais longo ou o padrão", () => {
    expect(nomeModelo("gemini-3.8-flash @ generativelanguage.googleapis.com")).toBe("gemini-3.8-flash");
    expect(precoDoModelo("gemini-3.8-flash @ x", precos)).toEqual({ entrada: 0.3, saida: 2.5 });
    expect(precoDoModelo("gemini-3.8-flash-001", precos)).toEqual({ entrada: 0.3, saida: 2.5 });
    expect(precoDoModelo("gemini-outro", precos)).toEqual({ entrada: 9, saida: 9 });
    expect(precoDoModelo("claude-x", precos)).toEqual({ entrada: 1, saida: 2 });
  });

  it("calcula US$ e R$", () => {
    const c = custoTokens("gemini-3.8-flash", 10_000, 4_000, precos, 5);
    expect(c.usd).toBeCloseTo(0.003 + 0.01);
    expect(c.brl).toBeCloseTo(0.065);
  });
});

describe("roteiro assinado", async () => {
  const { cidadeAuge, pedidoDoAssinado, regioesDoRoteiro, somarDias } = await import("@/lib/motor/assinado-pedido");
  const dias = [
    { dia: 1, cidade: "Doha", lat: 25.29, lng: 51.53 },
    { dia: 2, cidade: "Phuket", lat: 7.88, lng: 98.39 },
    { dia: 3, cidade: "Phuket", lat: 7.88, lng: 98.39 },
    { dia: 4, cidade: "Seul", lat: 37.57, lng: 126.98 },
    { dia: 5, cidade: "Seul", lat: 37.57, lng: 126.98 },
    { dia: 6, cidade: "Seul", lat: 37.57, lng: 126.98 },
    { dia: 7, cidade: "Doha", lat: 25.29, lng: 51.53 },
  ];

  it("regiões na ordem das cidades e auge pela maior estadia", () => {
    expect(regioesDoRoteiro(dias)).toEqual(["oriente-medio", "sudeste-asiatico", "asia-leste"]);
    expect(cidadeAuge(dias)).toBe("Seul");
    expect(somarDias("2026-11-14", 22)).toBe("2026-12-06");
  });

  it("vira um pedido válido com a duração do roteiro", () => {
    const p = pedidoDoAssinado(
      { titulo: "Qatar + Tailândia + Coreia", duracao_dias: 7, dias },
      { data_inicio: "2026-11-14", cidade_origem: "Goiânia", adultos: 2, criancas: 0, orcamento: "medio", ritmo_viagem: "medio", observacoes: "" },
    );
    expect(p.regioes).toEqual(["oriente-medio", "sudeste-asiatico", "asia-leste"]);
    expect(p.data_fim).toBe("2026-11-21");
    expect(p.auge_da_viagem).toBe("Seul");
    expect(p.locais_desejados_complementares).toEqual(["Doha", "Phuket"]);
    expect(p.observacoes).toMatch(/Roteiro assinado/);
  });

  it("dias a mais alongam a viagem (para as portas), dias a menos não encurtam o roteiro", () => {
    const esc = { data_inicio: "2026-11-14", cidade_origem: "São Paulo", adultos: 2, criancas: 0, orcamento: "medio", ritmo_viagem: "medio", observacoes: "" } as const;
    const base = { titulo: "X", duracao_dias: 7, dias };
    expect(pedidoDoAssinado(base, { ...esc, dias_viagem: 10 }).data_fim).toBe("2026-11-24");
    expect(pedidoDoAssinado(base, { ...esc, dias_viagem: 3 }).data_fim).toBe("2026-11-21");
  });

  it("o auge declarado pelo consultor vence a cidade com mais dias", () => {
    const esc = { data_inicio: "2026-11-14", cidade_origem: "São Paulo", adultos: 2, criancas: 0, orcamento: "medio", ritmo_viagem: "medio", observacoes: "" } as const;
    expect(pedidoDoAssinado({ titulo: "X", auge: "Phuket", duracao_dias: 7, dias }, esc).auge_da_viagem).toBe("Phuket");
  });
});

describe("painel de medição", async () => {
  const { resumirUso } = await import("@/lib/medicao-painel");
  const linha = (o: Partial<import("@/lib/medicao-painel").LinhaUso>) => ({
    tipo: "geracao",
    produto: "roteiro",
    user_id: "u1",
    trip_request_id: "t1",
    custo_brl: 0.1,
    input_tokens: 100,
    output_tokens: 50,
    sucesso: true,
    created_at: "2026-10-15T10:00:00Z",
    ...o,
  });

  it("custo por consulta soma geração e ajustes, e calcula a margem do produto", () => {
    const r = resumirUso(
      [
        linha({}),
        linha({ tipo: "ajuste", produto: null, custo_brl: 0.05 }),
        linha({ trip_request_id: "t2", custo_brl: 0.25 }),
        linha({ tipo: "adaptacao", produto: "assinado", trip_request_id: "t3", custo_brl: 0.3 }),
        linha({ tipo: "extracao", produto: null, trip_request_id: null, user_id: "admin", custo_brl: 1, sucesso: false }),
      ],
      { roteiro: 9.9, assinado: 14.9 },
    );
    expect(r.custoTotal).toBeCloseTo(1.7);
    expect(r.falhas).toBe(1);
    const roteiro = r.porProduto.find((p) => p.produto === "roteiro")!;
    expect(roteiro.consultas).toBe(2);
    expect(roteiro.custoMedio).toBeCloseTo(0.2);
    expect(roteiro.margem).toBeCloseTo(9.7);
    expect(r.porProduto.find((p) => p.produto === "assinado")!.margemPct).toBeCloseTo(((14.9 - 0.3) / 14.9) * 100);
    expect(r.porTipo.find((t) => t.tipo === "geracao")!.n).toBe(2);
    expect(r.porUsuario[0]).toMatchObject({ user_id: "admin", custo: 1 });
  });
});
