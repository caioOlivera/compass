import { checarRegrasDoRoteiro } from "@/lib/itinerary/rules";
import { ItinerarySchema, type Itinerary } from "@/lib/validation/itinerary";
import type { ItineraryPromptInput } from "@/lib/validation/trip-request";

// Motor de roteiros, independente do provedor de IA: chama o modelo, valida com Zod e com as
// regras de negócio e, se o roteiro vier com problema, faz uma nova tentativa com o JSON
// anterior e a lista de erros. Cada provedor só implementa um ChamadorModelo (providers/).

const MAX_TENTATIVAS = 2;

export type RespostaModelo = {
  texto: string;
  /** fim = terminou normalmente; tamanho = cortado por limite de tokens; recusa = o modelo recusou */
  parada: "fim" | "tamanho" | "recusa";
  modelo: string;
  inputTokens: number;
  outputTokens: number;
};

/** Recebe a mensagem do usuário (o system prompt é responsabilidade de cada provedor). */
export type ChamadorModelo = (mensagem: string) => Promise<RespostaModelo>;

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

export async function gerarRoteiro(pedido: ItineraryPromptInput, chamar: ChamadorModelo): Promise<ResultadoGeracao> {
  const inicio = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let anterior: { json: string; erros: string[] } | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const resposta = await chamar(montarMensagem(pedido, anterior));
    inputTokens += resposta.inputTokens;
    outputTokens += resposta.outputTokens;

    if (resposta.parada === "recusa") {
      throw new GeracaoError("recusa", "A IA não aceitou gerar este roteiro. Revise as observações e tente de novo.");
    }

    const texto = extrairJson(resposta.texto);
    const erros =
      resposta.parada === "tamanho"
        ? ["A resposta anterior foi cortada por tamanho. Seja mais conciso nos textos e checklists."]
        : validar(texto, pedido);

    if (erros.length === 0) {
      return {
        roteiro: ItinerarySchema.parse(JSON.parse(texto)),
        modelo: resposta.modelo,
        tentativas: tentativa,
        inputTokens,
        outputTokens,
        latenciaMs: Date.now() - inicio,
      };
    }

    anterior = { json: texto, erros };
    if (tentativa === MAX_TENTATIVAS) {
      const motivo: MotivoFalha = resposta.parada === "tamanho" ? "truncado" : "invalido";
      throw new GeracaoError(motivo, "Não conseguimos montar um roteiro consistente. Tente de novo.", erros);
    }
  }

  throw new Error("inalcançável");
}

/**
 * Modelos sem saída estruturada (comum em modelos locais) às vezes embrulham o JSON em
 * ```json ... ``` ou escrevem o raciocínio em <think>...</think> antes. Fica só o objeto.
 */
export function extrairJson(texto: string): string {
  const semPensamento = texto.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const cerca = semPensamento.match(/```(?:json)?\s*([\s\S]*?)```/);
  const corpo = (cerca ? cerca[1] : semPensamento).trim();
  const inicio = corpo.indexOf("{");
  const fim = corpo.lastIndexOf("}");
  return inicio !== -1 && fim > inicio ? corpo.slice(inicio, fim + 1) : corpo;
}

function validar(texto: string, pedido: ItineraryPromptInput): string[] {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return ["A resposta não era um JSON válido. Responda apenas com o objeto JSON, sem texto em volta."];
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
