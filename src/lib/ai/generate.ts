import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ITINERARY_SYSTEM_PROMPT } from "@/lib/ai/prompts/itinerary-system";
import { checarRegrasDoRoteiro } from "@/lib/itinerary/rules";
import { ItinerarySchema, type Itinerary } from "@/lib/validation/itinerary";
import type { ItineraryPromptInput } from "@/lib/validation/trip-request";

// Motor de roteiros: Claude com structured output + validação Zod + regras de negócio.
// Se o roteiro vier com problema, uma nova tentativa leva o JSON anterior e a lista de erros.

const MAX_TENTATIVAS = 2;

const MODELOS_COM_FALLBACK = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

// Só o JSON Schema; sem o parse automático do SDK, que lança exceção e perderia os erros
// de validação que queremos devolver ao modelo.
const { type, schema } = betaZodOutputFormat(ItinerarySchema);
const FORMATO_SAIDA = { type, schema };

export type ResultadoGeracao = {
  roteiro: Itinerary;
  modelo: string;
  tentativas: number;
  inputTokens: number;
  outputTokens: number;
  latenciaMs: number;
};

export type MotivoFalha = "recusa" | "invalido" | "truncado";

export class GeracaoError extends Error {
  constructor(
    readonly motivo: MotivoFalha,
    message: string,
    readonly detalhes: string[] = [],
  ) {
    super(message);
    this.name = "GeracaoError";
  }
}

export type OpcoesGeracao = {
  client: Anthropic;
  modelo: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  signal?: AbortSignal;
};

export async function gerarRoteiro(pedido: ItineraryPromptInput, opcoes: OpcoesGeracao): Promise<ResultadoGeracao> {
  const inicio = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let anterior: { json: string; erros: string[] } | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const stream = opcoes.client.beta.messages.stream(
      {
        model: opcoes.modelo,
        max_tokens: 32_000,
        system: ITINERARY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: montarMensagem(pedido, anterior) }],
        output_config: { effort: opcoes.effort, format: FORMATO_SAIDA },
        // Se o modelo principal recusar por engano, a API refaz no modelo de fallback.
        // Só alguns modelos aceitam o parâmetro (o Haiku, por exemplo, responde 400).
        ...(MODELOS_COM_FALLBACK.has(opcoes.modelo)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { signal: opcoes.signal },
    );
    const resposta: Anthropic.Beta.BetaMessage = await stream.finalMessage();
    inputTokens += resposta.usage.input_tokens;
    outputTokens += resposta.usage.output_tokens;

    if (resposta.stop_reason === "refusal") {
      throw new GeracaoError("recusa", "A IA não aceitou gerar este roteiro. Revise as observações e tente de novo.");
    }

    const texto: string = resposta.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const erros =
      resposta.stop_reason === "max_tokens"
        ? ["A resposta anterior foi cortada por tamanho. Seja mais conciso nos textos e checklists."]
        : validar(texto, pedido);

    if (erros.length === 0) {
      return {
        roteiro: ItinerarySchema.parse(JSON.parse(texto)),
        modelo: resposta.model,
        tentativas: tentativa,
        inputTokens,
        outputTokens,
        latenciaMs: Date.now() - inicio,
      };
    }

    anterior = { json: texto, erros };
    if (tentativa === MAX_TENTATIVAS) {
      const motivo: MotivoFalha = resposta.stop_reason === "max_tokens" ? "truncado" : "invalido";
      throw new GeracaoError(motivo, "Não conseguimos montar um roteiro consistente. Tente de novo.", erros);
    }
  }

  throw new Error("inalcançável");
}

function validar(texto: string, pedido: ItineraryPromptInput): string[] {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return ["A resposta não era um JSON válido."];
  }
  const r = ItinerarySchema.safeParse(bruto);
  if (!r.success) {
    return r.error.issues.map((i) => `Campo ${i.path.join(".") || "(raiz)"}: ${i.message}`);
  }
  return checarRegrasDoRoteiro(r.data, pedido);
}

function montarMensagem(pedido: ItineraryPromptInput, anterior: { json: string; erros: string[] } | null): string {
  const base = `Monte o roteiro para estas respostas do questionário:\n\n${JSON.stringify(pedido, null, 2)}`;
  if (!anterior) return base;
  return [
    base,
    "Uma tentativa anterior gerou o roteiro abaixo, mas ele tem problemas.",
    `<roteiro_anterior>\n${anterior.json}\n</roteiro_anterior>`,
    `Corrija todos estes problemas e devolva o roteiro completo:\n${anterior.erros.map((e) => `- ${e}`).join("\n")}`,
  ].join("\n\n");
}
