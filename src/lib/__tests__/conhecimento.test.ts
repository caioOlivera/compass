import { describe, expect, it, vi } from "vitest";
import { dadosPessoaisNoItem, ExtracaoSchema, itensDaExtracao, type Extracao } from "@/lib/conhecimento/extracao";
import {
  formatarCusto,
  formatarDuracao,
  nomeChave,
  nomePais,
  preencherVazios,
  textoBuscaLugar,
  textoBuscaTrecho,
} from "@/lib/conhecimento/registros";

vi.mock("server-only", () => ({}));

const lugar = {
  destino: "Phi Phi",
  pais_codigo: "TH",
  nome: "Tom Yam Restaurant",
  tipo: "restaurante" as const,
  tags: ["gastronomia" as const, "barato" as const],
  resumo: "Pad See Ew barato e bom, perto do centrinho.",
  tempo_visita_min: null,
  custo: { valor: 12, moeda: "BRL", ref: "2023-01", obs: "o prato" },
  reservar_antes: null,
  melhor_horario: null,
  veredito: "recomendado" as const,
  citacao: "recomendo o restaurante Tom Yam Restaurant",
};

const extracaoVazia: Extracao = {
  fonte: { titulo: "Teste", viagem_mes: "2023-01", paises: ["TH"] },
  destinos: [],
  lugares: [],
  trechos: [],
  dicas: [],
  eventos: [],
  roteiro: null,
};

describe("registros da base", () => {
  it("nomeChave ignora acento, caixa e artigo inicial", () => {
    expect(nomeChave("O Coliseu")).toBe(nomeChave("coliseu"));
    expect(nomeChave("Florença")).toBe("florenca");
    expect(nomeChave("Wat Pho")).toBe("wat pho");
  });

  it("nomePais traduz o código ISO", () => {
    expect(nomePais("TH")).toBe("Tailândia");
    expect(nomePais("KR")).toBe("Coreia do Sul");
  });

  it("preencherVazios só completa o que falta e une listas", () => {
    const atual: Record<string, unknown> = { resumo: "já tem", custo: null, tags: ["praia"], mencoes: 2 };
    expect(preencherVazios(atual, { resumo: "outro", custo: { valor: 1 }, tags: ["praia", "barato"] })).toEqual({
      custo: { valor: 1 },
      tags: ["praia", "barato"],
    });
    expect(preencherVazios(atual, { tags: ["praia"] })).toEqual({});
  });

  it("formata custo com moeda e referência, e duração", () => {
    expect(formatarCusto({ valor: 620, moeda: "BRL", ref: "2023-01", obs: "o casal" })?.replace(/\s/g, " ")).toBe("R$ 620,00 o casal (ref. 01/2023)");
    expect(formatarCusto(null)).toBeNull();
    expect(formatarDuracao(240)).toBe("4h");
    expect(formatarDuracao(95)).toBe("1h 35min");
    expect(formatarDuracao(40)).toBe("40min");
  });

  it("texto de busca do lugar e do trecho", () => {
    expect(textoBuscaLugar(lugar)).toContain("Tom Yam Restaurant (restaurante) em Phi Phi, Tailândia.");
    expect(textoBuscaLugar(lugar)).toContain("Recomendado.");
    expect(
      textoBuscaTrecho({
        origem: "Chiang Mai",
        destino: "Sukhothai",
        pais_codigo_origem: "TH",
        pais_codigo_destino: "TH",
        meio: "taxi",
        duracao_min: 240,
        custo: null,
        operador: null,
        obs: "O ônibus leva 12 h.",
        citacao: "fomos de taxi foram 4horas",
      }),
    ).toBe("Como ir de Chiang Mai para Sukhothai: táxi. Duração: 4h. O ônibus leva 12 h.");
  });
});

describe("extração", () => {
  it("schema aceita a extração e desmonta em itens com destinos primeiro", () => {
    const e = ExtracaoSchema.parse({
      ...extracaoVazia,
      lugares: [lugar],
      destinos: [
        { nome: "Phi Phi", tipo: "cidade", pais_codigo: "TH", lat: null, lng: null, resumo: null, melhor_epoca_meses: [], evitar_meses: [], moeda: null, visto: null },
      ],
    });
    expect(itensDaExtracao(e).map((i) => i.tipo)).toEqual(["destino", "lugar"]);
  });

  it("schema recusa código de país e mês inválidos", () => {
    expect(ExtracaoSchema.safeParse({ ...extracaoVazia, fonte: { titulo: "x y", viagem_mes: "2023-13", paises: [] } }).success).toBe(false);
    expect(ExtracaoSchema.safeParse({ ...extracaoVazia, lugares: [{ ...lugar, pais_codigo: "tha" }] }).success).toBe(false);
  });

  it("acha perfil, e-mail e telefone em qualquer campo", () => {
    expect(dadosPessoaisNoItem(lugar)).toEqual([]);
    expect(dadosPessoaisNoItem({ ...lugar, resumo: "veja no @fulano.viaja" })).toEqual(["resumo"]);
    expect(dadosPessoaisNoItem({ ...lugar, citacao: "liga (21) 99999-0000" })).toEqual(["citacao"]);
    expect(dadosPessoaisNoItem({ a: [{ b: "x@y.com" }] })).toEqual(["a[0].b"]);
  });
});

describe("ingestão (partes puras)", async () => {
  const { dividirTexto, juntarExtracoes, limparTexto } = await import("@/lib/conhecimento/ingestao");

  it("limpa BOM, CRLF e linhas em excesso", () => {
    expect(limparTexto("﻿a \r\n\r\n\r\n\r\nb\r\n")).toBe("a\n\nb");
  });

  it("divide texto longo em parágrafos sem perder conteúdo", () => {
    const paragrafo = "x".repeat(400);
    const texto = Array.from({ length: 30 }, () => paragrafo).join("\n\n");
    const partes = dividirTexto(texto, 2000);
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.every((p) => p.length <= 2000)).toBe(true);
    expect(partes.join("").replace(/\s/g, "")).toBe(texto.replace(/\s/g, ""));
    expect(dividirTexto("curto", 2000)).toEqual(["curto"]);
  });

  it("junta extrações de partes somando listas e unindo países", () => {
    const a = { ...extracaoVazia, lugares: [lugar] };
    const b = { ...extracaoVazia, fonte: { ...extracaoVazia.fonte, paises: ["KR"] }, lugares: [{ ...lugar, nome: "Outro" }] };
    const j = juntarExtracoes([a, b]);
    expect(j.lugares).toHaveLength(2);
    expect(j.fonte.paises).toEqual(["TH", "KR"]);
  });
});
