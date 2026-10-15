import type { ChamadorModelo } from "@/lib/ai/generate";
import { ITINERARY_SYSTEM_PROMPT } from "@/lib/ai/prompts/itinerary-system";
import { ITINERARY_JSON_SCHEMA } from "@/lib/ai/schema";

// Qualquer provedor que fale o formato de chat da OpenAI (POST {base}/chat/completions):
// Ollama e LM Studio locais, Gemini, Groq, OpenRouter, Mistral, a própria OpenAI...
// Usa fetch direto para não depender de outro SDK.

export type ModoJson =
  /** Saída presa ao JSON Schema (Ollama, Gemini, OpenAI, parte dos modelos do Groq/OpenRouter) */
  | "json_schema"
  /** Só garante JSON válido; o schema vai no prompt (quem não aceita json_schema) */
  | "json_object"
  /** Nada no request; o schema vai no prompt (último recurso) */
  | "nenhum";

export type OpcoesOpenAICompat = {
  baseUrl: string;
  apiKey?: string;
  modelo: string;
  modoJson: ModoJson;
  signal?: AbortSignal;
  fetch?: typeof fetch;
};

// O schema vai também no prompt: no modo json_object o modelo não o recebe de outra forma,
// e modelos menores seguem melhor quando o veem por escrito.
const SYSTEM_PROMPT = `${ITINERARY_SYSTEM_PROMPT}

Responda somente com um objeto JSON, sem texto antes ou depois e sem bloco de código, seguindo este JSON Schema:
${JSON.stringify(ITINERARY_JSON_SCHEMA)}`;

export function chamadorOpenAICompat(opcoes: OpcoesOpenAICompat): ChamadorModelo {
  const url = `${opcoes.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const executar = opcoes.fetch ?? fetch;

  return async (mensagem) => {
    const res = await executar(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opcoes.apiKey ? { Authorization: `Bearer ${opcoes.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opcoes.modelo,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: mensagem },
        ],
        temperature: 0.4,
        ...formatoResposta(opcoes.modoJson),
      }),
      signal: opcoes.signal,
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      throw new ProvedorError(res.status, `${opcoes.modelo} respondeu ${res.status}: ${corpo.slice(0, 300)}`);
    }

    const dados = (await res.json()) as RespostaChat;
    const escolha = dados.choices?.[0];
    if (!escolha) throw new ProvedorError(502, "Resposta sem choices");

    return {
      texto: escolha.message?.content ?? "",
      parada: escolha.finish_reason === "length" ? "tamanho" : escolha.message?.refusal ? "recusa" : "fim",
      modelo: dados.model ?? opcoes.modelo,
      inputTokens: dados.usage?.prompt_tokens ?? 0,
      outputTokens: dados.usage?.completion_tokens ?? 0,
    };
  };
}

function formatoResposta(modo: ModoJson) {
  if (modo === "json_schema") {
    return { response_format: { type: "json_schema", json_schema: { name: "roteiro", schema: ITINERARY_JSON_SCHEMA, strict: true } } };
  }
  if (modo === "json_object") return { response_format: { type: "json_object" } };
  return {};
}

/** Erro HTTP do provedor. 429 e 5xx são temporários (sobrecarga, limite do plano grátis). */
export class ProvedorError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProvedorError";
  }
}

type RespostaChat = {
  model?: string;
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};
