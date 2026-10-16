import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoteiroBaseAdaptar } from "@/lib/ai/generate";
import type { DiaComLocal } from "@/lib/motor/assinado-pedido";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export type RoteiroAssinado = RoteiroBaseAdaptar & { id: string; dias: (RoteiroBaseAdaptar["dias"][number] & DiaComLocal)[] };

/** Roteiro assinado aprovado, com as coordenadas das cidades e os eventos delas (via service_role). */
export async function carregarRoteiroAssinado(db: Db, id: string): Promise<RoteiroAssinado | null> {
  const { data: r } = await db
    .from("roteiros_base")
    .select("id, titulo, auge, duracao_dias, epoca, essencia, roteiro_base_dias(dia, cidade, pernoite, atividades, deslocamento, obs, destino_id, destinos(lat, lng))")
    .eq("id", id)
    .eq("assinado", true)
    .eq("status", "aprovado")
    .maybeSingle();
  if (!r) return null;

  const dias = [...(r.roteiro_base_dias ?? [])].sort((a, b) => a.dia - b.dia);
  const destinos = [...new Set(dias.map((d) => d.destino_id).filter((x): x is string => !!x))];
  const { data: eventos } = destinos.length
    ? await db.from("eventos").select("nome, regra_data, destinos(nome)").in("destino_id", destinos).eq("status", "aprovado")
    : { data: [] };

  return {
    id: r.id,
    titulo: r.titulo,
    auge: r.auge,
    duracao_dias: r.duracao_dias,
    epoca: r.epoca,
    essencia: r.essencia,
    dias: dias.map((d) => ({
      dia: d.dia,
      cidade: d.cidade,
      pernoite: d.pernoite,
      atividades: d.atividades,
      deslocamento: d.deslocamento,
      obs: d.obs,
      lat: d.destinos?.lat ?? null,
      lng: d.destinos?.lng ?? null,
    })),
    eventos: (eventos ?? []).map((e) => ({ destino: e.destinos?.nome ?? "", nome: e.nome, regra_data: e.regra_data })),
  };
}
