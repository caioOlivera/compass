import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { configEmbeddings, gerarEmbeddings, paraPgvector } from "@/lib/ai/embeddings";
import { buscarNaBase } from "@/lib/conhecimento/busca";
import { nomeChave } from "@/lib/conhecimento/registros";
import { dentroDaSubregiao } from "@/lib/geo/subregions";
import {
  consultasDoPedido,
  formatarContexto,
  SIMILARIDADE_MINIMA,
  type Achado,
  type MapaRefs,
} from "@/lib/motor/contexto-formato";
import type { ContextoBase } from "@/lib/ai/generate";
import type { ItineraryPromptInput } from "@/lib/validation/trip-request";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export type ContextoMontado = { contexto: ContextoBase; mapa: MapaRefs; consultas: number; caracteresConsulta: number };

/** Países da base que caem nas regiões escolhidas (pelas coordenadas das cidades) ou que o viajante citou. */
async function paisesDoPedido(db: Db, pedido: ItineraryPromptInput): Promise<string[] | undefined> {
  const { data } = await db.from("destinos").select("pais_codigo, nome_chave, lat, lng").eq("status", "aprovado");
  if (!data?.length) return undefined;
  const citados = new Set([pedido.auge_da_viagem, ...pedido.locais_desejados_complementares].map(nomeChave));
  const paises = new Set<string>();
  for (const d of data) {
    const naRegiao = d.lat !== null && d.lng !== null && pedido.regioes.some((r) => dentroDaSubregiao(r, { lat: d.lat!, lng: d.lng! }));
    if (naRegiao || citados.has(d.nome_chave)) paises.add(d.pais_codigo);
  }
  return paises.size ? [...paises] : undefined;
}

/**
 * Busca na base o que interessa a este pedido (por significado, se houver embeddings; senão por
 * palavras) e devolve o bloco numerado para o prompt. Base vazia ou fora do ar: contexto vazio.
 */
export async function montarContextoBase(db: Db, pedido: ItineraryPromptInput): Promise<ContextoMontado> {
  const vazio: ContextoMontado = { contexto: { texto: "", refs: [] }, mapa: {}, consultas: 0, caracteresConsulta: 0 };
  const consultas = consultasDoPedido(pedido);
  const caracteresConsulta = consultas.join(" ").length;

  try {
    const paises = await paisesDoPedido(db, pedido);
    const config = configEmbeddings();
    let resultados: Achado[][] = [];

    if (config) {
      const vetores = await gerarEmbeddings(consultas, "consulta", config);
      resultados = await Promise.all(
        vetores.map(async (v) => {
          const { data } = await db.rpc("buscar_conhecimento", { p_embedding: paraPgvector(v), p_paises: paises, p_limite: 20 });
          return data ?? [];
        }),
      );
    } else {
      resultados = await Promise.all(consultas.map(async (c) => (await buscarNaBase(db, c, { paises, limite: 15 })).resultados));
    }

    const { contexto, mapa } = formatarContexto(resultados, {
      evitar: pedido.locais_a_evitar,
      minimo: config ? SIMILARIDADE_MINIMA : 0.34,
    });
    return { contexto, mapa, consultas: consultas.length, caracteresConsulta };
  } catch (e) {
    console.error("[contexto-base] seguindo sem a base:", e);
    return vazio;
  }
}
