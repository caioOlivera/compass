import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { configEmbeddings, gerarEmbeddings, paraPgvector, type ConfigEmbeddings } from "@/lib/ai/embeddings";
import { registrarUso } from "@/lib/medicao";
import { normalizarNome } from "@/lib/validation/trip-request";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export type ResultadoBusca = {
  registro_tipo: string;
  registro_id: string;
  pais_codigo: string | null;
  texto: string;
  similaridade: number;
};

/** Gera embeddings para o que ainda não tem (registros recém-aprovados). Devolve quantos indexou. */
export async function indexarPendentes(db: Db, limite = 300, config: ConfigEmbeddings | null = configEmbeddings()): Promise<number> {
  if (!config) return 0;
  const { data, error } = await db.from("conhecimento_busca").select("id, texto").is("embedding", null).limit(limite);
  if (error) throw new Error(error.message);
  if (!data?.length) return 0;
  const caracteres = data.reduce((s, d) => s + d.texto.length, 0);

  const vetores = await gerarEmbeddings(
    data.map((d) => d.texto),
    "documento",
    config,
  );
  for (let i = 0; i < data.length; i++) {
    const r = await db
      .from("conhecimento_busca")
      .update({ embedding: paraPgvector(vetores[i]), modelo: config.modelo })
      .eq("id", data[i].id);
    if (r.error) throw new Error(r.error.message);
  }
  // ~4 caracteres por token: estimativa (a API de embeddings não devolve a contagem)
  await registrarUso(db, { tipo: "embedding", provedor: "gemini", modelo: config.modelo, inputTokens: Math.ceil(caracteres / 4), unidades: data.length });
  return data.length;
}

/**
 * Busca na base: por significado (embedding) quando há chave do Gemini; senão, por palavras.
 * `paises` filtra por código ISO (ex.: ["TH", "KR"]).
 */
export async function buscarNaBase(
  db: Db,
  consulta: string,
  opcoes: { paises?: string[]; limite?: number } = {},
): Promise<{ modo: "semantica" | "palavras"; resultados: ResultadoBusca[] }> {
  const limite = opcoes.limite ?? 30;
  const paises = opcoes.paises?.length ? opcoes.paises : undefined;
  const config = configEmbeddings();

  if (config) {
    try {
      const [vetor] = await gerarEmbeddings([consulta], "consulta", config);
      const { data, error } = await db.rpc("buscar_conhecimento", {
        p_embedding: paraPgvector(vetor),
        p_paises: paises,
        p_limite: limite,
      });
      if (!error && data?.length) return { modo: "semantica", resultados: data };
    } catch {
      // cai para a busca por palavras
    }
  }
  return { modo: "palavras", resultados: await buscarPorPalavras(db, consulta, paises, limite) };
}

async function buscarPorPalavras(db: Db, consulta: string, paises: string[] | undefined, limite: number) {
  const palavras = normalizarNome(consulta)
    .split(" ")
    .filter((p) => p.length >= 3)
    .slice(0, 6);
  if (!palavras.length) return [];
  let q = db
    .from("conhecimento_busca")
    .select("registro_tipo, registro_id, pais_codigo, texto")
    .or(palavras.map((p) => `texto.ilike.%${p.replace(/[%,()]/g, "")}%`).join(","))
    .limit(limite * 3);
  if (paises) q = q.in("pais_codigo", paises);
  const { data } = await q;
  // Ordena por quantas palavras da consulta aparecem no texto
  return (data ?? [])
    .map((r) => {
      const t = normalizarNome(r.texto);
      return { ...r, similaridade: palavras.filter((p) => t.includes(p)).length / palavras.length };
    })
    .sort((a, b) => b.similaridade - a.similaridade)
    .slice(0, limite);
}
