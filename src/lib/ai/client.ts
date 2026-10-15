import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";

let client: Anthropic | undefined;

export function anthropic(): Anthropic {
  // maxRetries: o SDK repete 408/409/429/5xx e falha de conexão sozinho
  client ??= new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY, maxRetries: 2 });
  return client;
}
