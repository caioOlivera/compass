import type Anthropic from "@anthropic-ai/sdk";
import type { ChamadorModelo } from "@/lib/ai/generate";
import { ITINERARY_SYSTEM_PROMPT } from "@/lib/ai/prompts/itinerary-system";
import { ITINERARY_JSON_SCHEMA } from "@/lib/ai/schema";

// Claude via SDK oficial: structured output, streaming (evita timeout HTTP) e, nos modelos
// que aceitam, fallback do lado do servidor quando o modelo recusa por engano.

const MODELOS_COM_FALLBACK = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

export type OpcoesAnthropic = {
  client: Anthropic;
  modelo: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  signal?: AbortSignal;
};

export function chamadorAnthropic({ client, modelo, effort, signal }: OpcoesAnthropic): ChamadorModelo {
  return async (mensagem) => {
    const stream = client.beta.messages.stream(
      {
        model: modelo,
        max_tokens: 32_000,
        system: ITINERARY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: mensagem }],
        output_config: { effort, format: { type: "json_schema", schema: ITINERARY_JSON_SCHEMA } },
        // Só alguns modelos aceitam o parâmetro (o Haiku, por exemplo, responde 400).
        ...(MODELOS_COM_FALLBACK.has(modelo)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { signal },
    );
    const resposta: Anthropic.Beta.BetaMessage = await stream.finalMessage();
    return {
      texto: resposta.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""),
      parada:
        resposta.stop_reason === "refusal" ? "recusa" : resposta.stop_reason === "max_tokens" ? "tamanho" : "fim",
      modelo: resposta.model,
      inputTokens: resposta.usage.input_tokens,
      outputTokens: resposta.usage.output_tokens,
    };
  };
}
