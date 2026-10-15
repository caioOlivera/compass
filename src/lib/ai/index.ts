import "server-only";
import { anthropic } from "@/lib/ai/client";
import { gerarRoteiro, type ResultadoGeracao } from "@/lib/ai/generate";
import { chamadorAnthropic } from "@/lib/ai/providers/anthropic";
import { gerarRoteiroDemonstracao } from "@/lib/ai/providers/demo";
import { chamadorOpenAICompat } from "@/lib/ai/providers/openai-compatible";
import { serverEnv } from "@/lib/env";
import type { ItineraryPromptInput } from "@/lib/validation/trip-request";

/** Escolhe o motor pelo AI_PROVIDER do .env (anthropic | openai-compatible | demo). */
export function gerarComProvedorConfigurado(pedido: ItineraryPromptInput, signal?: AbortSignal): Promise<ResultadoGeracao> {
  const env = serverEnv();
  switch (env.AI_PROVIDER) {
    case "demo":
      return gerarRoteiroDemonstracao(pedido);
    case "openai-compatible": {
      const chamar = chamadorOpenAICompat({
        baseUrl: env.AI_BASE_URL!,
        apiKey: env.AI_API_KEY,
        modelo: env.AI_MODEL!,
        modoJson: env.AI_JSON_MODE,
        signal,
      });
      return gerarRoteiro(pedido, chamar).then((r) => ({ ...r, modelo: `${r.modelo} @ ${new URL(env.AI_BASE_URL!).host}` }));
    }
    case "anthropic":
      return gerarRoteiro(
        pedido,
        chamadorAnthropic({ client: anthropic(), modelo: env.ANTHROPIC_MODEL, effort: env.ANTHROPIC_EFFORT, signal }),
      );
  }
}
