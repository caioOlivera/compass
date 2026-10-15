import { describe, expect, it } from "vitest";
import { dentroDaSubregiao } from "@/lib/geo/subregions";
import {
  alternarItem,
  geojsonDosTrechos,
  limitesDoRoteiro,
  progressoChecklist,
  tipoTransporte,
  trechosDoRoteiro,
} from "@/lib/itinerary/map";
import { checarRegrasDoRoteiro } from "@/lib/itinerary/rules";
import { pedidoPRD, roteiroPRD } from "@/lib/itinerary/exemplo";

describe("checarRegrasDoRoteiro", () => {
  it("o roteiro do PRD passa sem erros", () => {
    expect(checarRegrasDoRoteiro(roteiroPRD(), pedidoPRD)).toEqual([]);
  });

  it("soma de dias diferente do total", () => {
    const r = roteiroPRD();
    r.pontos_mapa[2].dias_alocados = 6;
    expect(checarRegrasDoRoteiro(r, pedidoPRD)).toEqual([
      "A soma de dias_alocados é 13; precisa ser exatamente 15.",
    ]);
  });

  it("local a evitar na rota, mesmo com sufixo", () => {
    const r = roteiroPRD();
    r.pontos_mapa[1].nome_local = "Veneza Mestre";
    expect(checarRegrasDoRoteiro(r, pedidoPRD).join()).toMatch(/locais a evitar/);
  });

  it('compara palavras inteiras: evitar "Rom" não barra "Roma"', () => {
    const erros = checarRegrasDoRoteiro(roteiroPRD(), { ...pedidoPRD, locais_a_evitar: ["Rom"] });
    expect(erros).toEqual([]);
  });

  it("deslocamento apontando para o ponto errado e último ponto com deslocamento", () => {
    const r = roteiroPRD();
    r.pontos_mapa[0].proximo_deslocamento!.destino_id = "p3";
    r.pontos_mapa[3].proximo_deslocamento = { ...r.pontos_mapa[2].proximo_deslocamento!, destino_id: "p1" };
    const erros = checarRegrasDoRoteiro(r, pedidoPRD);
    expect(erros).toContain('proximo_deslocamento de "Roma" deve apontar para "p2".');
    expect(erros).toContain('O último ponto ("Milão") deve ter proximo_deslocamento null.');
  });

  it("coordenadas invertidas caem fora da sub-região", () => {
    const r = roteiroPRD();
    r.pontos_mapa[0].coordenadas = { lat: 12.4964, lng: 41.9028 };
    expect(checarRegrasDoRoteiro(r, pedidoPRD).join()).toMatch(/fora da sub-região europa-do-sul/);
  });

  it("bate-e-volta: mesmo local duas vezes", () => {
    const r = roteiroPRD();
    r.pontos_mapa[1].nome_local = "roma";
    expect(checarRegrasDoRoteiro(r, pedidoPRD).join()).toMatch(/aparece duas vezes/);
  });

  it("hubs fora das pontas", () => {
    const r = roteiroPRD();
    r.pontos_mapa[1].tipo_ponto = "hub_saida";
    r.pontos_mapa[3].tipo_ponto = "auge_viagem";
    const erros = checarRegrasDoRoteiro(r, pedidoPRD);
    expect(erros).toContain('O último ponto deve ser "hub_saida".');
    expect(erros).toContain('"Florença" está no meio da rota e não pode ser hub_saida.');
  });
});

describe("sub-regiões", () => {
  it.each([
    ["europa-do-sul", 37.0, 25.4], // Naxos
    ["europa-do-sul", 28.29, -16.63], // Tenerife
    ["america-do-sul", -0.74, -90.31], // Galápagos
    ["oceania", -17.53, -149.57], // Taiti
    ["oceania", -45.03, 168.66], // Queenstown
    ["asia-leste", 35.68, 139.69], // Tóquio
    ["asia-sul", 27.17, 78.04], // Agra
    ["asia-sul", 4.17, 73.51], // Malé, Maldivas
    ["asia-sul", 6.93, 79.85], // Colombo
  ] as const)("%s contém (%d, %d)", (sub, lat, lng) => {
    expect(dentroDaSubregiao(sub, { lat, lng })).toBe(true);
  });

  it("Tóquio não está na Europa do Sul", () => {
    expect(dentroDaSubregiao("europa-do-sul", { lat: 35.68, lng: 139.69 })).toBe(false);
  });
});

describe("estado do mapa", () => {
  it("trechos ligam pontos consecutivos", () => {
    expect(trechosDoRoteiro(roteiroPRD()).map((t) => t.id)).toEqual(["p1-p2", "p2-p3", "p3-p4"]);
  });

  it("limites cobrem todos os pontos", () => {
    expect(limitesDoRoteiro(roteiroPRD().pontos_mapa)).toEqual([
      [9.19, 41.9028],
      [12.4964, 46.5369],
    ]);
  });

  it("alternar item marca, desmarca e limpa a chave vazia", () => {
    let s = alternarItem({}, "p1", 2);
    s = alternarItem(s, "p1", 0);
    expect(s).toEqual({ p1: [0, 2] });
    s = alternarItem(alternarItem(s, "p1", 0), "p1", 2);
    expect(s).toEqual({});
  });

  it("progresso ignora índices que não existem mais", () => {
    expect(progressoChecklist(roteiroPRD(), { p1: [0, 1, 9], p4: [0] })).toEqual({ marcados: 3, total: 7 });
  });
});

describe("transporte", () => {
  it.each([
    ["Trem Frecciarossa", "trem"],
    ["Carro alugado", "carro"],
    ["Voo low-cost Ryanair", "voo"],
    ["Ferry com carro para Santorini", "barco"],
    ["Ônibus FlixBus", "onibus"],
    ["A pé", "outro"],
  ] as const)("%s → %s", (meio, tipo) => {
    expect(tipoTransporte(meio)).toBe(tipo);
  });

  it("GeoJSON com uma linha por trecho, [lng, lat]", () => {
    const fc = geojsonDosTrechos(trechosDoRoteiro(roteiroPRD()));
    expect(fc.features).toHaveLength(3);
    expect(fc.features[0].properties).toEqual({ id: "p1-p2", tipo: "trem" });
    expect(fc.features[0].geometry.coordinates[0]).toEqual([12.4964, 41.9028]);
  });
});
