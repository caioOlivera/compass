import "server-only";
import { serverEnv } from "@/lib/env";

// Embeddings do Gemini (API nativa), 768 dimensões: o mesmo tamanho da coluna no banco.
// Documento e consulta usam "tarefas" diferentes, como o Gemini recomenda para busca.

export const DIMENSOES_EMBEDDING = 768;
const LOTE = 100; // limite de itens por chamada batchEmbedContents

export type TarefaEmbedding = "documento" | "consulta";

export type ConfigEmbeddings = { apiKey: string; modelo: string };

/** Chave e modelo configurados, ou null (sem embeddings: a busca usa texto). */
export function configEmbeddings(): ConfigEmbeddings | null {
  const env = serverEnv();
  const doGemini = env.AI_BASE_URL?.includes("generativelanguage.googleapis.com") ? env.AI_API_KEY : undefined;
  const apiKey = env.EMBEDDINGS_API_KEY ?? doGemini;
  return apiKey ? { apiKey, modelo: env.EMBEDDINGS_MODEL } : null;
}

export async function gerarEmbeddings(
  textos: string[],
  tarefa: TarefaEmbedding,
  config: ConfigEmbeddings,
  executar: typeof fetch = fetch,
): Promise<number[][]> {
  const saida: number[][] = [];
  for (let i = 0; i < textos.length; i += LOTE) {
    const lote = textos.slice(i, i + LOTE);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo}:batchEmbedContents`;
    const res = await executar(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({
        requests: lote.map((t) => ({
          model: `models/${config.modelo}`,
          content: { parts: [{ text: t.slice(0, 8000) }] },
          taskType: tarefa === "documento" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
          outputDimensionality: DIMENSOES_EMBEDDING,
        })),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Embeddings: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
    const dados = (await res.json()) as { embeddings?: { values?: number[] }[] };
    const vetores = (dados.embeddings ?? []).map((e) => normalizar(e.values ?? []));
    if (vetores.length !== lote.length || vetores.some((v) => v.length !== DIMENSOES_EMBEDDING)) {
      throw new Error("Embeddings: resposta com tamanho inesperado");
    }
    saida.push(...vetores);
  }
  return saida;
}

/** Vetores truncados (768 de 3072) precisam ser normalizados, segundo a documentação do Gemini. */
export function normalizar(v: number[]): number[] {
  const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norma > 0 ? v.map((x) => x / norma) : v;
}

/** Formato aceito pelo pgvector via PostgREST: "[0.1,0.2,...]". */
export function paraPgvector(v: number[]): string {
  return `[${v.map((x) => Number(x.toFixed(7))).join(",")}]`;
}
