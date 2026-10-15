import "server-only";
import { z } from "zod";

// Variáveis do servidor validadas na primeira leitura (não no import, para o build passar sem .env).
const ServerEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

    // Quem gera os roteiros
    AI_PROVIDER: z.enum(["anthropic", "openai-compatible", "demo"]).default("anthropic"),

    // AI_PROVIDER=anthropic
    ANTHROPIC_API_KEY: z.string().min(10).optional(),
    ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
    ANTHROPIC_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),

    // AI_PROVIDER=openai-compatible (Ollama, LM Studio, Gemini, Groq, OpenRouter, Mistral...)
    AI_BASE_URL: z.url().optional(),
    AI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().optional(),
    AI_JSON_MODE: z.enum(["json_schema", "json_object", "nenhum"]).default("json_schema"),

    DAILY_GENERATION_LIMIT: z.coerce.number().int().min(1).default(5),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "obrigatória com AI_PROVIDER=anthropic" });
    }
    if (env.AI_PROVIDER === "openai-compatible") {
      if (!env.AI_BASE_URL) ctx.addIssue({ code: "custom", path: ["AI_BASE_URL"], message: "obrigatória com AI_PROVIDER=openai-compatible" });
      if (!env.AI_MODEL) ctx.addIssue({ code: "custom", path: ["AI_MODEL"], message: "obrigatória com AI_PROVIDER=openai-compatible" });
    }
  });

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cache: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cache) {
    // Variáveis vazias no .env ("X=") contam como ausentes
    const definidas = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
    const r = ServerEnvSchema.safeParse(definidas);
    if (!r.success) {
      const problemas = r.error.issues.map((i) => `${i.path.join(".")} (${i.message})`).join(", ");
      throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${problemas}. Veja .env.example.`);
    }
    cache = r.data;
  }
  return cache;
}
