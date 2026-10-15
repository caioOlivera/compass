import "server-only";
import { anthropic } from "@/lib/ai/client";
import { gerarRoteiro, type ChamadorModelo, type ContextoBase, type ModoGeracao, type ResultadoGeracao } from "@/lib/ai/generate";
import { chamadorAnthropic } from "@/lib/ai/providers/anthropic";
import { gerarRoteiroDemonstracao } from "@/lib/ai/providers/demo";
import { chamadorOpenAICompat, type TarefaJson } from "@/lib/ai/providers/openai-compatible";
import { serverEnv } from "@/lib/env";
import type { ItineraryPromptInput } from "@/lib/validation/trip-request";

/** Escolhe o motor pelo AI_PROVIDER do .env (anthropic | openai-compatible | demo). */
export function gerarComProvedorConfigurado(
  pedido: ItineraryPromptInput,
  signal?: AbortSignal,
  contexto?: ContextoBase,
  modo?: ModoGeracao,
): Promise<ResultadoGeracao> {
  const env = serverEnv();
  switch (env.AI_PROVIDER) {
    case "demo":
      if (modo?.tipo === "ajuste") {
        const r = modo.roteiroAtual.resumo_estrategico;
        return Promise.resolve({
          roteiro: { ...modo.roteiroAtual, resumo_estrategico: { ...r, alertas: ["Modo demonstração: o ajuste não foi aplicado.", ...r.alertas] } },
          modelo: "demonstracao",
          tentativas: 1,
          inputTokens: 0,
          outputTokens: 0,
          latenciaMs: 0,
        });
      }
      return gerarRoteiroDemonstracao(pedido);
    case "openai-compatible": {
      const chamar = chamadorOpenAICompat({
        baseUrl: env.AI_BASE_URL!,
        apiKey: env.AI_API_KEY,
        modelo: env.AI_MODEL!,
        modelosReserva: env.AI_FALLBACK_MODELS?.split(",").map((m) => m.trim()).filter(Boolean),
        modoJson: env.AI_JSON_MODE,
        signal,
      });
      return gerarRoteiro(pedido, chamar, contexto, modo).then((r) => ({ ...r, modelo: `${r.modelo} @ ${new URL(env.AI_BASE_URL!).host}` }));
    }
    case "anthropic":
      return gerarRoteiro(
        pedido,
        chamadorAnthropic({ client: anthropic(), modelo: env.ANTHROPIC_MODEL, effort: env.ANTHROPIC_EFFORT, signal }),
        contexto,
        modo,
      );
  }
}

/**
 * Chamador do provedor configurado para uma tarefa JSON qualquer (instruções + schema).
 * null no modo demonstração: quem chama decide o que fazer sem IA.
 */
export function chamadorParaTarefa(tarefa: TarefaJson, signal?: AbortSignal): { chamar: ChamadorModelo; descricao: string } | null {
  const env = serverEnv();
  switch (env.AI_PROVIDER) {
    case "demo":
      return null;
    case "openai-compatible":
      return {
        chamar: chamadorOpenAICompat({
          baseUrl: env.AI_BASE_URL!,
          apiKey: env.AI_API_KEY,
          modelo: env.AI_MODEL!,
          modelosReserva: env.AI_FALLBACK_MODELS?.split(",").map((m) => m.trim()).filter(Boolean),
          modoJson: env.AI_JSON_MODE,
          tarefa,
          signal,
        }),
        descricao: `${env.AI_MODEL} @ ${new URL(env.AI_BASE_URL!).host}`,
      };
    case "anthropic":
      return {
        chamar: chamadorAnthropic({ client: anthropic(), modelo: env.ANTHROPIC_MODEL, effort: env.ANTHROPIC_EFFORT, tarefa, signal }),
        descricao: env.ANTHROPIC_MODEL,
      };
  }
}
