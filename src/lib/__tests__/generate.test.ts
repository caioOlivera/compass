import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { GeracaoError, gerarRoteiro } from "@/lib/ai/generate";
import { pedidoPRD, roteiroPRD } from "./fixtures";

type Resposta = { texto: string; stop_reason?: string };

// Cliente falso: devolve as respostas na ordem e guarda o que foi enviado.
function clienteFalso(respostas: Resposta[]) {
  const chamadas: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: Record<string, unknown>) {
          chamadas.push(params);
          const r = respostas[chamadas.length - 1];
          return {
            finalMessage: async () => ({
              model: "claude-opus-5-5",
              stop_reason: r.stop_reason ?? "end_turn",
              content: [{ type: "thinking", thinking: "" }, { type: "text", text: r.texto }],
              usage: { input_tokens: 1000, output_tokens: 500 },
            }),
          };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, chamadas };
}

const opcoes = (client: Anthropic) => ({ client, modelo: "claude-opus-5-5", effort: "medium" as const });
const ok = JSON.stringify(roteiroPRD());

function semDias() {
  const r = roteiroPRD();
  r.pontos_mapa[2].dias_alocados = 6;
  return JSON.stringify(r);
}

describe("gerarRoteiro", () => {
  it("roteiro válido de primeira", async () => {
    const { client, chamadas } = clienteFalso([{ texto: ok }]);
    const r = await gerarRoteiro(pedidoPRD, opcoes(client));
    expect(r.tentativas).toBe(1);
    expect(r.roteiro.pontos_mapa).toHaveLength(4);
    expect(r.inputTokens).toBe(1000);

    const p = chamadas[0] as { output_config: { format: { type: string; schema: unknown } }; fallbacks: string };
    expect(p.output_config.format.type).toBe("json_schema");
    expect(p.output_config.format).not.toHaveProperty("parse");
    expect(p.fallbacks).toBe("default");
  });

  it("refaz com os erros quando a soma de dias não fecha", async () => {
    const { client, chamadas } = clienteFalso([{ texto: semDias() }, { texto: ok }]);
    const r = await gerarRoteiro(pedidoPRD, opcoes(client));
    expect(r.tentativas).toBe(2);
    expect(r.inputTokens).toBe(2000);

    const segunda = (chamadas[1].messages as { content: string }[])[0].content;
    expect(segunda).toContain("<roteiro_anterior>");
    expect(segunda).toContain("A soma de dias_alocados é 13; precisa ser exatamente 15.");
  });

  it("refaz quando o JSON viola o schema", async () => {
    const quebrado = roteiroPRD();
    (quebrado.pontos_mapa[0].coordenadas as { lat: unknown }).lat = "41.9";
    const { client, chamadas } = clienteFalso([{ texto: JSON.stringify(quebrado) }, { texto: ok }]);
    await gerarRoteiro(pedidoPRD, opcoes(client));
    expect((chamadas[1].messages as { content: string }[])[0].content).toContain("pontos_mapa.0.coordenadas.lat");
  });

  it("desiste depois de duas tentativas inválidas", async () => {
    const { client } = clienteFalso([{ texto: semDias() }, { texto: semDias() }]);
    const e = await gerarRoteiro(pedidoPRD, opcoes(client)).catch((x) => x);
    expect(e).toBeInstanceOf(GeracaoError);
    expect(e.motivo).toBe("invalido");
    expect(e.detalhes).toHaveLength(1);
  });

  it("recusa não gasta nova tentativa", async () => {
    const { client, chamadas } = clienteFalso([{ texto: "", stop_reason: "refusal" }]);
    const e = await gerarRoteiro(pedidoPRD, opcoes(client)).catch((x) => x);
    expect(e.motivo).toBe("recusa");
    expect(chamadas).toHaveLength(1);
  });

  it("resposta cortada por tamanho pede concisão e, se repetir, vira 'truncado'", async () => {
    const corte = { texto: ok.slice(0, 200), stop_reason: "max_tokens" };
    const { client, chamadas } = clienteFalso([corte, corte]);
    const e = await gerarRoteiro(pedidoPRD, opcoes(client)).catch((x) => x);
    expect(e.motivo).toBe("truncado");
    expect((chamadas[1].messages as { content: string }[])[0].content).toContain("cortada por tamanho");
  });
});
