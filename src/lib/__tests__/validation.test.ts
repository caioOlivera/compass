import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ChecklistStateSchema, ItinerarySchema } from "@/lib/validation/itinerary";
import {
  diasEntre,
  fromTripRequestRow,
  normalizarNome,
  toTripRequestRow,
  TripRequestInputSchema,
} from "@/lib/validation/trip-request";
import { pedidoPRD, roteiroPRD } from "@/lib/itinerary/exemplo";

const base = {
  regioes: ["europa"],
  data_inicio: "2026-09-10",
  data_fim: "2026-09-25",
  ritmo_viagem: "medio",
  auge_da_viagem: "Dolomitas",
  cidade_origem: "Rio de Janeiro",
};

describe("TripRequestInputSchema", () => {
  it("aceita o exemplo do PRD e calcula 15 dias", () => {
    expect(pedidoPRD.total_dias_viagem).toBe(15);
    expect(pedidoPRD.flexibilidade_dias_ida).toBe(0);
    expect(pedidoPRD.observacoes).toMatch(/carro/);
  });

  it("recusa retorno antes da saída e viagens longas demais", () => {
    expect(TripRequestInputSchema.safeParse({ ...base, data_fim: "2026-09-10" }).success).toBe(false);
    expect(TripRequestInputSchema.safeParse({ ...base, data_fim: "2027-01-10" }).success).toBe(false);
  });

  it("recusa região, ritmo e flexibilidade fora da lista", () => {
    expect(TripRequestInputSchema.safeParse({ ...base, regioes: ["marte"] }).success).toBe(false);
    expect(TripRequestInputSchema.safeParse({ ...base, ritmo_viagem: "turbo" }).success).toBe(false);
    expect(TripRequestInputSchema.safeParse({ ...base, flexibilidade_dias_ida: 6 }).success).toBe(false);
  });

  it("recusa o mesmo local em desejados e a evitar, ignorando acento e caixa", () => {
    const r = TripRequestInputSchema.safeParse({
      ...base,
      locais_desejados_complementares: ["Milão"],
      locais_a_evitar: ["milao"],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["locais_a_evitar"]);
  });

  it("recusa evitar o próprio auge", () => {
    expect(TripRequestInputSchema.safeParse({ ...base, locais_a_evitar: ["dolomitas"] }).success).toBe(false);
  });

  it("remove locais repetidos e espaços", () => {
    const r = TripRequestInputSchema.parse({ ...base, locais_desejados_complementares: [" Roma ", "roma", "Milão"] });
    expect(r.locais_desejados_complementares).toEqual(["Roma", "Milão"]);
  });

  it("ida e volta pelas colunas do banco preserva o pedido", () => {
    const row = toTripRequestRow(pedidoPRD);
    expect(row.subregion).toBe("europa");
    expect(row.avoided_places).toEqual(["Veneza"]);
    const { total_dias_viagem: _, ...semTotal } = pedidoPRD;
    expect(fromTripRequestRow(row as Required<typeof row>)).toEqual(semTotal);
  });
});

describe("utilidades", () => {
  it("diasEntre bate com end_date - start_date do Postgres, inclusive na virada de horário de verão", () => {
    expect(diasEntre("2026-09-10", "2026-09-25")).toBe(15);
    expect(diasEntre("2026-10-30", "2026-11-02")).toBe(3);
  });

  it("normalizarNome", () => {
    expect(normalizarNome("  Cortina d'Ampezzo ")).toBe("cortina d ampezzo");
    expect(normalizarNome("MILÃO")).toBe("milao");
  });
});

describe("ItinerarySchema", () => {
  it("aceita o roteiro do PRD", () => {
    expect(ItinerarySchema.parse(roteiroPRD())).toEqual(roteiroPRD());
  });

  it("recusa categoria fora da lista e coordenada impossível", () => {
    const r = roteiroPRD();
    r.pontos_mapa[0].atribuicoes_e_checklist[0].categoria = "Balada" as never;
    expect(ItinerarySchema.safeParse(r).success).toBe(false);

    const r2 = roteiroPRD();
    r2.pontos_mapa[0].coordenadas.lat = 120;
    expect(ItinerarySchema.safeParse(r2).success).toBe(false);
  });

  it("gera um JSON Schema aceito pelo structured output do Claude", () => {
    const { schema } = zodOutputFormat(ItinerarySchema) as unknown as { schema: Record<string, unknown> };
    const json = JSON.stringify(schema);
    // Restrições que a API não aceita precisam ter sido retiradas pelo SDK
    for (const proibido of ['"minLength"', '"maxLength"', '"minimum"', '"maximum"']) {
      expect(json).not.toContain(proibido);
    }
    // Todo objeto fechado
    const objetos = [...json.matchAll(/"type":"object"/g)].length;
    const fechados = [...json.matchAll(/"additionalProperties":false/g)].length;
    expect(fechados).toBe(objetos);
  });
});

describe("ChecklistStateSchema", () => {
  it("aceita índices por ponto e recusa chave inválida", () => {
    expect(ChecklistStateSchema.safeParse({ p1: [0, 2] }).success).toBe(true);
    expect(ChecklistStateSchema.safeParse({ roma: [0] }).success).toBe(false);
    expect(ChecklistStateSchema.safeParse({ p1: [-1] }).success).toBe(false);
  });
});
