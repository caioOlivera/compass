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
