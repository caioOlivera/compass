import "server-only";
import { z } from "zod";

// Variáveis do servidor validadas na primeira leitura (não no import, para o build passar sem .env).
const ServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ANTHROPIC_API_KEY: z.string().min(10),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  ANTHROPIC_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),
  DAILY_GENERATION_LIMIT: z.coerce.number().int().min(1).default(5),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cache: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cache) {
    const r = ServerEnvSchema.safeParse(process.env);
    if (!r.success) {
      const faltando = r.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${faltando}. Veja .env.example.`);
    }
    cache = r.data;
  }
  return cache;
}
