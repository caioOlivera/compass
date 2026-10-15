import { describe, expect, it } from "vitest";
import { TripRequestInputSchema } from "@/lib/validation/trip-request";
import { etapaDoCampo, RASCUNHO_VAZIO, validarEtapa } from "@/lib/wizard";

const HOJE = "2026-10-15";

describe("validarEtapa", () => {
  it("etapa 1 exige sub-região e ignora os campos das outras etapas", () => {
    expect(validarEtapa(RASCUNHO_VAZIO, 0, HOJE)).toEqual({ continente_regiao: "Escolha uma sub-região" });
    expect(validarEtapa({ ...RASCUNHO_VAZIO, continente_regiao: "europa" }, 0, HOJE)).toEqual({});
  });

  it("etapa 2 pega retorno antes da saída mesmo com o resto do formulário vazio", () => {
    const r = { ...RASCUNHO_VAZIO, data_inicio: "2026-12-10", data_fim: "2026-12-01" };
    expect(validarEtapa(r, 1, HOJE)).toEqual({ data_fim: "O retorno precisa ser depois da saída" });
  });

  it("etapa 2 recusa data de saída no passado", () => {
    const r = { ...RASCUNHO_VAZIO, data_inicio: "2026-10-01", data_fim: "2026-10-20" };
    expect(validarEtapa(r, 1, HOJE)).toEqual({ data_inicio: "A data de saída já passou" });
  });

  it("etapa 2 exige as duas datas", () => {
    expect(Object.keys(validarEtapa(RASCUNHO_VAZIO, 1, HOJE)).sort()).toEqual(["data_fim", "data_inicio"]);
  });

  it("etapa 4 pega o mesmo local nas duas listas", () => {
    const r = { ...RASCUNHO_VAZIO, locais_desejados_complementares: ["Milão"], locais_a_evitar: ["milao"] };
    expect(validarEtapa(r, 3, HOJE)).toEqual({ locais_a_evitar: '"Milão" está nas duas listas' });
  });

  it("formulário completo passa em todas as etapas e no schema", () => {
    const r = {
      ...RASCUNHO_VAZIO,
      continente_regiao: "europa" as const,
      data_inicio: "2026-11-10",
      data_fim: "2026-11-25",
      auge_da_viagem: "Dolomitas",
      cidade_origem: "Rio de Janeiro",
      ritmo_viagem: "medio" as const,
    };
    for (let i = 0; i < 7; i++) expect(validarEtapa(r, i, HOJE)).toEqual({});
    expect(TripRequestInputSchema.safeParse(r).success).toBe(true);
  });
});

describe("etapaDoCampo", () => {
  it("leva ao primeiro campo com erro vindo da API", () => {
    expect(etapaDoCampo(["cidade_origem", "data_inicio"])).toBe(1);
    expect(etapaDoCampo(["observacoes"])).toBe(6);
  });
});

describe("barra de progresso da geração", () => {
  it("anda rápido no começo, desacelera e nunca passa de 95%", async () => {
    const { progressoEstimado } = await import("@/components/wizard/generating");
    expect(progressoEstimado(0)).toBe(0);
    expect(progressoEstimado(10)).toBeGreaterThan(0.25);
    expect(progressoEstimado(45)).toBeGreaterThan(0.7);
    expect(progressoEstimado(45)).toBeLessThan(0.85);
    expect(progressoEstimado(600)).toBeLessThanOrEqual(0.95);
  });
});

describe("sugestões de auge", () => {
  it("toda região do questionário tem pelo menos 5 sugestões", async () => {
    const { SUBREGIOES } = await import("@/lib/constants");
    const { SUGESTOES_AUGE } = await import("@/lib/sugestoes-auge");
    for (const r of SUBREGIOES) expect(SUGESTOES_AUGE[r.id].length).toBeGreaterThanOrEqual(5);
  });
});
