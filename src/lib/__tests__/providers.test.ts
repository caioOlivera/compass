import { describe, expect, it } from "vitest";
import { extrairJson, gerarRoteiro } from "@/lib/ai/generate";
import { gerarRoteiroDemonstracao, roteiroDemonstracao } from "@/lib/ai/providers/demo";
import { chamadorOpenAICompat, ProvedorError } from "@/lib/ai/providers/openai-compatible";
import { pedidoPRD, roteiroPRD } from "@/lib/itinerary/exemplo";
import { checarRegrasDoRoteiro } from "@/lib/itinerary/rules";
import { ItinerarySchema } from "@/lib/validation/itinerary";

type Chamada = { url: string; init: RequestInit; corpo: Record<string, unknown> };

// fetch falso no formato /chat/completions
function fetchFalso(respostas: { status?: number; conteudo?: string; finish?: string }[]) {
  const chamadas: Chamada[] = [];
  const f = (async (url: string, init: RequestInit) => {
    chamadas.push({ url, init, corpo: JSON.parse(String(init.body)) });
    const r = respostas[chamadas.length - 1];
    if (r.status && r.status !== 200) return new Response("limite do plano grátis", { status: r.status });
    return Response.json({
      model: "qwen3:14b",
      choices: [{ message: { content: r.conteudo }, finish_reason: r.finish ?? "stop" }],
      usage: { prompt_tokens: 3000, completion_tokens: 2500 },
    });
  }) as unknown as typeof fetch;
  return { f, chamadas };
}

const ok = JSON.stringify(roteiroPRD());

describe("chamadorOpenAICompat", () => {
  it("monta o request no formato OpenAI com JSON Schema e chave", async () => {
    const { f, chamadas } = fetchFalso([{ conteudo: ok }]);
    const chamar = chamadorOpenAICompat({
      baseUrl: "http://localhost:11434/v1/",
      apiKey: "abc",
      modelo: "qwen3:14b",
      modoJson: "json_schema",
      fetch: f,
    });
    const r = await gerarRoteiro(pedidoPRD, chamar);

    expect(r.roteiro.pontos_mapa).toHaveLength(4);
    expect(r.modelo).toBe("qwen3:14b");
    expect(r.inputTokens).toBe(3000);
    expect(chamadas[0].url).toBe("http://localhost:11434/v1/chat/completions");
    expect((chamadas[0].init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
    const formato = chamadas[0].corpo.response_format as { type: string; json_schema: { schema: object } };
    expect(formato.type).toBe("json_schema");
    expect(formato.json_schema.schema).toHaveProperty("properties.pontos_mapa");
    const msgs = chamadas[0].corpo.messages as { role: string; content: string }[];
    expect(msgs.map((m) => m.role)).toEqual(["system", "user"]);
    expect(msgs[0].content).toContain("JSON Schema");
  });

  it("modo json_object e sem chave (Ollama local)", async () => {
    const { f, chamadas } = fetchFalso([{ conteudo: ok }]);
    await gerarRoteiro(pedidoPRD, chamadorOpenAICompat({ baseUrl: "http://x/v1", modelo: "m", modoJson: "json_object", fetch: f }));
    expect(chamadas[0].corpo.response_format).toEqual({ type: "json_object" });
    expect(chamadas[0].init.headers).not.toHaveProperty("Authorization");
  });

  it("aceita JSON dentro de bloco de código e com <think> antes, e refaz quando a regra falha", async () => {
    const r = roteiroPRD();
    r.pontos_mapa[2].dias_alocados = 6;
    const { f, chamadas } = fetchFalso([
      { conteudo: "<think>vou pensar</think>\n```json\n" + JSON.stringify(r) + "\n```" },
      { conteudo: ok },
    ]);
    const res = await gerarRoteiro(pedidoPRD, chamadorOpenAICompat({ baseUrl: "http://x/v1", modelo: "m", modoJson: "nenhum", fetch: f }));
    expect(res.tentativas).toBe(2);
    expect(chamadas[0].corpo).not.toHaveProperty("response_format");
    expect((chamadas[1].corpo.messages as { content: string }[])[1].content).toContain("precisa ser exatamente 15");
  });

  it("finish_reason length vira resposta cortada", async () => {
    const { f } = fetchFalso([
      { conteudo: ok.slice(0, 100), finish: "length" },
      { conteudo: ok.slice(0, 100), finish: "length" },
    ]);
    const e = await gerarRoteiro(pedidoPRD, chamadorOpenAICompat({ baseUrl: "http://x/v1", modelo: "m", modoJson: "json_schema", fetch: f })).catch((x) => x);
    expect(e.motivo).toBe("truncado");
  });

  it("HTTP 429 do plano grátis vira ProvedorError com status", async () => {
    const { f } = fetchFalso([{ status: 429 }]);
    const e = await gerarRoteiro(pedidoPRD, chamadorOpenAICompat({ baseUrl: "http://x/v1", modelo: "m", modoJson: "json_schema", fetch: f })).catch((x) => x);
    expect(e).toBeInstanceOf(ProvedorError);
    expect(e.status).toBe(429);
  });
});

describe("extrairJson", () => {
  it("texto antes e depois do objeto", () => {
    expect(extrairJson('Aqui está: {"a": 1} Boa viagem!')).toBe('{"a": 1}');
  });
});

describe("modo demonstração", () => {
  it.each([1, 2, 3, 4, 7, 15, 30, 90])("%i dias: roteiro válido, dias somam o total, aviso de demonstração", (dias) => {
    const r = roteiroDemonstracao(dias);
    expect(ItinerarySchema.safeParse(r).success).toBe(true);
    expect(r.pontos_mapa.reduce((s, p) => s + p.dias_alocados, 0)).toBe(dias);
    expect(r.resumo_estrategico.alertas[0]).toMatch(/Modo demonstração/);
    // passa nas mesmas regras do roteiro real (com a sub-região do exemplo)
    expect(checarRegrasDoRoteiro(r, { ...pedidoPRD, total_dias_viagem: dias, locais_a_evitar: [] })).toEqual([]);
  });

  it("não gasta tokens", async () => {
    const r = await gerarRoteiroDemonstracao(pedidoPRD);
    expect(r.modelo).toBe("demonstracao");
    expect(r.inputTokens + r.outputTokens).toBe(0);
  });
});

describe("ITINERARY_JSON_SCHEMA", () => {
  it("sem $ref nem $defs (aceito por Gemini/Groq) e com os campos do roteiro", async () => {
    const { ITINERARY_JSON_SCHEMA } = await import("@/lib/ai/schema");
    const json = JSON.stringify(ITINERARY_JSON_SCHEMA);
    expect(json).not.toContain("$ref");
    expect(json).not.toContain("$defs");
    expect(ITINERARY_JSON_SCHEMA).toHaveProperty("properties.pontos_mapa.items.properties.coordenadas.properties.lat");
  });
});
