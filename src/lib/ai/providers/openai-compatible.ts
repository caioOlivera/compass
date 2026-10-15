import type { ChamadorModelo, RespostaModelo } from "@/lib/ai/generate";
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
  /** Tentados em ordem quando o principal segue sobrecarregado (503) ou no limite (429). */
  modelosReserva?: string[];
  modoJson: ModoJson;
  /** Instruções e schema da tarefa; sem eles, a tarefa é gerar roteiro. */
  tarefa?: TarefaJson;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  /** Injetável nos testes para não esperar de verdade. */
  esperar?: (ms: number) => Promise<void>;
};

// Por modelo: 1 chamada + 2 repetições com espera crescente antes de passar ao reserva.
// Total no pior caso fica bem abaixo do maxDuration da rota (300 s).
const ESPERAS_MS = [2_000, 6_000];
const ESPERA_MAX_MS = 15_000;

export type TarefaJson = { nome: string; sistema: string; schema: { [chave: string]: unknown } };

export const TAREFA_ROTEIRO: TarefaJson = { nome: "roteiro", sistema: ITINERARY_SYSTEM_PROMPT, schema: ITINERARY_JSON_SCHEMA };

// O schema vai também no prompt: no modo json_object o modelo não o recebe de outra forma,
// e modelos menores seguem melhor quando o veem por escrito.
function promptDeSistema(t: TarefaJson) {
  return `${t.sistema}

Responda somente com um objeto JSON, sem texto antes ou depois e sem bloco de código, seguindo este JSON Schema:
${JSON.stringify(t.schema)}`;
}

export function chamadorOpenAICompat(opcoes: OpcoesOpenAICompat): ChamadorModelo {
  const url = `${opcoes.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const executar = opcoes.fetch ?? fetch;

  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const modelos = [opcoes.modelo, ...(opcoes.modelosReserva ?? [])];
  const tarefa = opcoes.tarefa ?? TAREFA_ROTEIRO;
  const sistema = promptDeSistema(tarefa);

  return async (mensagem) => {
    let ultimoErro: ProvedorError | undefined;
    for (const modelo of modelos) {
      for (let tentativa = 0; tentativa <= ESPERAS_MS.length; tentativa++) {
        try {
          return await chamar(modelo, mensagem);
        } catch (e) {
          if (!(e instanceof ProvedorError) || !e.temporario) throw e;
          ultimoErro = e;
          if (tentativa < ESPERAS_MS.length) await esperar(Math.min(e.retryAfterMs ?? ESPERAS_MS[tentativa], ESPERA_MAX_MS));
        }
      }
    }
    throw ultimoErro!;
  };

  async function chamar(modelo: string, mensagem: string) {
    const res = await executar(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opcoes.apiKey ? { Authorization: `Bearer ${opcoes.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: mensagem },
        ],
        temperature: 0.4,
        ...formatoResposta(opcoes.modoJson, tarefa),
      }),
      signal: opcoes.signal,
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      const retryAfter = Number(res.headers.get("retry-after"));
      throw new ProvedorError(
        res.status,
        `${modelo} respondeu ${res.status}: ${corpo.slice(0, 300)}`,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
      );
    }

    const dados = (await res.json()) as RespostaChat;
    const escolha = dados.choices?.[0];
    if (!escolha) throw new ProvedorError(502, "Resposta sem choices");

    return {
      texto: escolha.message?.content ?? "",
      parada: escolha.finish_reason === "length" ? "tamanho" : escolha.message?.refusal ? "recusa" : "fim",
      modelo: dados.model ?? modelo,
      inputTokens: dados.usage?.prompt_tokens ?? 0,
      outputTokens: dados.usage?.completion_tokens ?? 0,
    } satisfies RespostaModelo;
  }
}

function formatoResposta(modo: ModoJson, tarefa: TarefaJson) {
  if (modo === "json_schema") {
    return { response_format: { type: "json_schema", json_schema: { name: tarefa.nome, schema: tarefa.schema, strict: true } } };
  }
  if (modo === "json_object") return { response_format: { type: "json_object" } };
  return {};
}

/** Erro HTTP do provedor. 429 e 5xx são temporários (sobrecarga, limite do plano grátis). */
export class ProvedorError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ProvedorError";
  }

  /** Sobrecarga ou limite: vale esperar e repetir, ou trocar de modelo. */
  get temporario() {
    return this.status === 429 || this.status >= 500;
  }
}

type RespostaChat = {
  model?: string;
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};
