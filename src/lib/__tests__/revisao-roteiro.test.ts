import { describe, expect, it } from "vitest";
import { aplicarRevisao, revisoesPendentes } from "@/lib/conhecimento/revisao-roteiro";

describe("revisões sugeridas de roteiros prontos", () => {
  const atual = {
    titulo: "Dolomitas completo",
    auge: null,
    resumo: "Cinco dias",
    epoca: null,
    essencia: ["a"],
    paises: ["IT"],
    dias: [1, 2, 3, 4, 5].map((dia) => ({ dia, cidade: "Cortina", atividades: [], deslocamento: null, obs: null })),
  };

  it("estende o roteiro até total_dias e troca só o que a revisão traz", () => {
    const novo = aplicarRevisao(atual, { titulo: "Itália", total_dias: 12, dias: { "1": { cidade: "Milão" }, "12": { cidade: "Roma" } } });
    expect(novo.titulo).toBe("Itália");
    expect(novo.resumo).toBe("Cinco dias");
    expect(novo.dias).toHaveLength(12);
    expect(novo.dias[0].cidade).toBe("Milão");
    expect(novo.dias[1].cidade).toBe("Cortina");
    expect(novo.dias[11]).toMatchObject({ dia: 12, cidade: "Roma" });
  });

  it("junta as chaves por id e só lista o que não foi aplicado", () => {
    const configs = [
      { chave: "revisao_assinados_2", valor: { a: { total_dias: 12 } } },
      { chave: "revisao_assinados", valor: { a: { titulo: "A" }, b: { titulo: "B" } } },
    ];
    const r = revisoesPendentes(configs, { b: ["revisao_assinados"], a: ["revisao_assinados"] });
    expect(r.revisoes.a).toEqual({ titulo: "A", total_dias: 12 });
    expect(r.pendentes).toEqual(["a"]);
  });
});
