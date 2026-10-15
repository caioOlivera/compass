import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { RespostaModelo } from "@/lib/ai/generate";
import { gerarJsonValidado } from "@/lib/ai/json";

vi.mock("server-only", () => ({}));

const resposta = (texto: string, parada: RespostaModelo["parada"] = "fim"): RespostaModelo => ({
  texto,
  parada,
  modelo: "m",
  inputTokens: 10,
  outputTokens: 5,
});
const Schema = z.object({ n: z.number() });

describe("gerarJsonValidado", () => {
  it("devolve o JSON válido de primeira, mesmo com cerca de código", async () => {
    const r = await gerarJsonValidado({ chamar: async () => resposta('```json\n{"n": 1}\n```'), schema: Schema, mensagem: "m" });
    expect(r).toMatchObject({ dados: { n: 1 }, tentativas: 1, inputTokens: 10 });
  });

  it("repete com os erros e soma os tokens", async () => {
    const chamar = vi.fn().mockResolvedValueOnce(resposta('{"n": "um"}')).mockResolvedValueOnce(resposta('{"n": 2}'));
    const r = await gerarJsonValidado({ chamar, schema: Schema, mensagem: "original" });
    expect(r).toMatchObject({ dados: { n: 2 }, tentativas: 2, inputTokens: 20, outputTokens: 10 });
    expect(chamar.mock.calls[1][0]).toContain("original");
    expect(chamar.mock.calls[1][0]).toContain("Campo n");
  });

  it("falha depois do limite e em recusa", async () => {
    await expect(gerarJsonValidado({ chamar: async () => resposta("não é json"), schema: Schema, mensagem: "m" })).rejects.toMatchObject({
      motivo: "invalido",
    });
    await expect(gerarJsonValidado({ chamar: async () => resposta("", "recusa"), schema: Schema, mensagem: "m" })).rejects.toMatchObject({
      motivo: "recusa",
    });
  });
});

describe("embeddings", async () => {
  const { gerarEmbeddings, normalizar, paraPgvector } = await import("@/lib/ai/embeddings");

  it("normaliza e formata para o pgvector", () => {
    expect(normalizar([3, 4])).toEqual([0.6, 0.8]);
    expect(paraPgvector([0.5, 0.25])).toBe("[0.5,0.25]");
  });

  it("chama o Gemini em lote com a tarefa e as dimensões certas", async () => {
    const vetor = Array.from({ length: 768 }, () => 1);
    const f = vi.fn(async (_url: string, init: RequestInit) => {
      const corpo = JSON.parse(String(init.body)) as { requests: unknown[] };
      return Response.json({ embeddings: corpo.requests.map(() => ({ values: vetor })) });
    });
    const r = await gerarEmbeddings(["a", "b"], "consulta", { apiKey: "k", modelo: "gemini-embedding-001" }, f as unknown as typeof fetch);
    expect(r).toHaveLength(2);
    expect(r[0][0]).toBeCloseTo(1 / Math.sqrt(768));
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("gemini-embedding-001:batchEmbedContents");
    const corpo = JSON.parse(String(init.body));
    expect(corpo.requests[0]).toMatchObject({ taskType: "RETRIEVAL_QUERY", outputDimensionality: 768 });
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
  });

  it("erro HTTP vira exceção", async () => {
    const f = vi.fn(async () => new Response("quota", { status: 429 }));
    await expect(gerarEmbeddings(["a"], "documento", { apiKey: "k", modelo: "m" }, f as unknown as typeof fetch)).rejects.toThrow("429");
  });
});
