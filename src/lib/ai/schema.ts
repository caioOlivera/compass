import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ItinerarySchema } from "@/lib/validation/itinerary";

// JSON Schema do roteiro, gerado do Zod. O helper do SDK da Anthropic já tira o que as APIs de
// saída estruturada costumam recusar (min/max, minLength) e fecha todos os objetos.
// Min/max continuam valendo na validação Zod depois da resposta.
//
// As referências ($ref → $defs) são resolvidas no lugar: alguns provedores no formato OpenAI
// (Gemini, parte dos modelos do Groq) recusam schema com $ref. O schema não é recursivo.
export const ITINERARY_JSON_SCHEMA = resolverReferencias(
  betaZodOutputFormat(ItinerarySchema).schema as Record<string, unknown>,
);

type Json = unknown;

export function resolverReferencias(schema: Record<string, unknown>): Record<string, unknown> {
  const defs = (schema.$defs ?? {}) as Record<string, Json>;
  const resolver = (no: Json): Json => {
    if (Array.isArray(no)) return no.map(resolver);
    if (no && typeof no === "object") {
      const obj = no as Record<string, Json>;
      const ref = obj.$ref;
      if (typeof ref === "string" && ref.startsWith("#/$defs/")) {
        const { $ref: _, ...resto } = obj;
        return resolver({ ...(defs[ref.slice("#/$defs/".length)] as object), ...resto });
      }
      return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== "$defs").map(([k, v]) => [k, resolver(v)]));
    }
    return no;
  };
  return resolver(schema) as Record<string, unknown>;
}
