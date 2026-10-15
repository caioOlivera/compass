import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  schemaDoItem,
  type DestinoExtraido,
  type DicaExtraida,
  type EventoExtraido,
  type LugarExtraido,
  type RoteiroExtraido,
  type TipoItem,
  type TrechoExtraido,
} from "@/lib/conhecimento/extracao";
import {
  nomeChave,
  nomePais,
  preencherVazios,
  textoBuscaDestino,
  textoBuscaDica,
  textoBuscaEvento,
  textoBuscaLugar,
  textoBuscaRoteiro,
  textoBuscaTrecho,
} from "@/lib/conhecimento/registros";
import type { Database, Json } from "@/types/database";

// Aprovar um item da fila: cria o registro na base ou mescla com o que já existe (mesmo nome no
// mesmo destino), grava a citação da fonte e o texto de busca. O embedding vem depois, em lote.

type Db = SupabaseClient<Database>;
type Fonte = { id: string; autoria: string; tipo: string };

export class AprovacaoError extends Error {}

function falhou(contexto: string, erro: { message: string } | null): never {
  throw new AprovacaoError(`${contexto}: ${erro?.message ?? "erro desconhecido"}`);
}

/** Destinos resolvidos durante um lote de aprovações (evita consultar o mesmo várias vezes). */
export type CacheDestinos = Map<string, { id: string; paisCodigo: string }>;

async function garantirPais(db: Db, codigo: string, cache: CacheDestinos): Promise<string> {
  const chaveCache = `pais:${codigo}`;
  const emCache = cache.get(chaveCache);
  if (emCache) return emCache.id;
  const nome = nomePais(codigo);
  const { data } = await db.from("destinos").select("id").eq("pais_codigo", codigo).eq("tipo", "pais").maybeSingle();
  let id = data?.id;
  if (!id) {
    const r = await db
      .from("destinos")
      .insert({ nome, nome_chave: nomeChave(nome), tipo: "pais", pais_codigo: codigo })
      .select("id")
      .single();
    if (r.error) falhou(`criar país ${codigo}`, r.error);
    id = r.data.id;
  }
  cache.set(chaveCache, { id, paisCodigo: codigo });
  return id;
}

/** Acha (ou cria) a cidade/região pelo nome dentro do país. Se o nome é o do país, devolve o país. */
export async function resolverDestino(db: Db, nome: string, codigo: string, cache: CacheDestinos): Promise<string> {
  const chave = nomeChave(nome);
  if (chave === nomeChave(nomePais(codigo))) return garantirPais(db, codigo, cache);
  const chaveCache = `${codigo}:${chave}`;
  const emCache = cache.get(chaveCache);
  if (emCache) return emCache.id;

  const { data } = await db
    .from("destinos")
    .select("id")
    .eq("pais_codigo", codigo)
    .eq("nome_chave", chave)
    .neq("tipo", "pais")
    .limit(1)
    .maybeSingle();
  let id = data?.id;
  if (!id) {
    const pai = await garantirPais(db, codigo, cache);
    const r = await db
      .from("destinos")
      .insert({ nome: nome.trim(), nome_chave: chave, tipo: "cidade", pais_codigo: codigo, pai_id: pai })
      .select("id")
      .single();
    if (r.error) falhou(`criar destino ${nome}`, r.error);
    id = r.data.id;
  }
  cache.set(chaveCache, { id, paisCodigo: codigo });
  return id;
}

async function indexar(
  db: Db,
  registro: { tipo: TipoItem; id: string; destinoId: string | null; paisCodigo: string | null; texto: string },
) {
  const r = await db.from("conhecimento_busca").upsert(
    {
      registro_tipo: registro.tipo,
      registro_id: registro.id,
      destino_id: registro.destinoId,
      pais_codigo: registro.paisCodigo,
      texto: registro.texto,
      embedding: null,
      modelo: null,
    },
    { onConflict: "registro_tipo,registro_id", ignoreDuplicates: true },
  );
  if (r.error) falhou("indexar", r.error);
}

async function citar(db: Db, fonteId: string, tipo: TipoItem, registroId: string, trecho: string | null) {
  const r = await db.from("citacoes").insert({
    fonte_id: fonteId,
    registro_tipo: tipo,
    registro_id: registroId,
    trecho: trecho?.slice(0, 300) ?? null,
  });
  if (r.error) falhou("citar", r.error);
}

// ---------------------------------------------------------------------------------------------

async function aprovarDestino(db: Db, d: DestinoExtraido, cache: CacheDestinos): Promise<string> {
  const id =
    d.tipo === "pais" ? await garantirPais(db, d.pais_codigo, cache) : await resolverDestino(db, d.nome, d.pais_codigo, cache);
  const { data: atual } = await db.from("destinos").select("*").eq("id", id).single();
  if (atual) {
    const novo = {
      lat: d.lat,
      lng: d.lng,
      resumo: d.resumo,
      moeda: d.moeda,
      visto: d.visto,
      melhor_epoca_meses: d.melhor_epoca_meses,
      evitar_meses: d.evitar_meses,
      ...(d.tipo === "regiao" ? { tipo: "regiao" } : {}),
    };
    const mudancas = preencherVazios(atual, novo);
    if (Object.keys(mudancas).length) {
      const r = await db.from("destinos").update(mudancas).eq("id", id);
      if (r.error) falhou("atualizar destino", r.error);
    }
  }
  await indexar(db, { tipo: "destino", id, destinoId: id, paisCodigo: d.pais_codigo, texto: textoBuscaDestino(d) });
  return id;
}

async function aprovarLugar(db: Db, l: LugarExtraido, cache: CacheDestinos): Promise<string> {
  const destinoId = await resolverDestino(db, l.destino, l.pais_codigo, cache);
  const chave = nomeChave(l.nome);
  const { data: atual } = await db.from("lugares").select("*").eq("destino_id", destinoId).eq("nome_chave", chave).maybeSingle();

  if (atual) {
    const mudancas: Database["public"]["Tables"]["lugares"]["Update"] = {
      ...preencherVazios(atual, {
        tags: l.tags,
        tempo_visita_min: l.tempo_visita_min,
        custo: l.custo as Json,
        reservar_antes: l.reservar_antes,
        melhor_horario: l.melhor_horario,
      }),
      mencoes: atual.mencoes + 1,
      // Opinião clara vale mais que uma citação neutra
      ...(atual.veredito === "neutro" && l.veredito !== "neutro" ? { veredito: l.veredito } : {}),
    };
    const r = await db.from("lugares").update(mudancas).eq("id", atual.id);
    if (r.error) falhou("mesclar lugar", r.error);
    return atual.id;
  }

  const r = await db
    .from("lugares")
    .insert({
      destino_id: destinoId,
      nome: l.nome.trim(),
      nome_chave: chave,
      tipo: l.tipo,
      tags: l.tags,
      resumo: l.resumo,
      tempo_visita_min: l.tempo_visita_min,
      custo: l.custo as Json,
      reservar_antes: l.reservar_antes,
      melhor_horario: l.melhor_horario,
      veredito: l.veredito,
    })
    .select("id")
    .single();
  if (r.error) falhou("criar lugar", r.error);
  await indexar(db, { tipo: "lugar", id: r.data.id, destinoId, paisCodigo: l.pais_codigo, texto: textoBuscaLugar(l) });
  return r.data.id;
}

async function aprovarTrecho(db: Db, t: TrechoExtraido, cache: CacheDestinos): Promise<string> {
  const origemId = await resolverDestino(db, t.origem, t.pais_codigo_origem, cache);
  const destinoId = await resolverDestino(db, t.destino, t.pais_codigo_destino, cache);
  const { data: atual } = await db
    .from("trechos")
    .select("*")
    .eq("origem_id", origemId)
    .eq("destino_id", destinoId)
    .eq("meio", t.meio)
    .maybeSingle();

  if (atual) {
    const r = await db
      .from("trechos")
      .update({
        ...preencherVazios(atual, { duracao_min: t.duracao_min, custo: t.custo as Json, operador: t.operador, obs: t.obs }),
        mencoes: atual.mencoes + 1,
      })
      .eq("id", atual.id);
    if (r.error) falhou("mesclar trecho", r.error);
    return atual.id;
  }

  const r = await db
    .from("trechos")
    .insert({
      origem_id: origemId,
      destino_id: destinoId,
      meio: t.meio,
      duracao_min: t.duracao_min,
      custo: t.custo as Json,
      operador: t.operador,
      obs: t.obs,
    })
    .select("id")
    .single();
  if (r.error) falhou("criar trecho", r.error);
  await indexar(db, { tipo: "trecho", id: r.data.id, destinoId: origemId, paisCodigo: t.pais_codigo_origem, texto: textoBuscaTrecho(t) });
  return r.data.id;
}

async function aprovarDica(db: Db, d: DicaExtraida, cache: CacheDestinos, anoRef: number | null): Promise<string> {
  const destinoId = await resolverDestino(db, d.destino, d.pais_codigo, cache);
  let lugarId: string | null = null;
  if (d.lugar) {
    const { data } = await db.from("lugares").select("id").eq("destino_id", destinoId).eq("nome_chave", nomeChave(d.lugar)).maybeSingle();
    lugarId = data?.id ?? null;
  }
  const { data: igual } = await db.from("dicas").select("id").eq("destino_id", destinoId).eq("texto", d.texto.trim()).maybeSingle();
  if (igual) return igual.id;

  const r = await db
    .from("dicas")
    .insert({ destino_id: destinoId, lugar_id: lugarId, categoria: d.categoria, texto: d.texto.trim(), ano_ref: anoRef })
    .select("id")
    .single();
  if (r.error) falhou("criar dica", r.error);
  await indexar(db, { tipo: "dica", id: r.data.id, destinoId, paisCodigo: d.pais_codigo, texto: textoBuscaDica(d) });
  return r.data.id;
}

async function aprovarEvento(db: Db, e: EventoExtraido, cache: CacheDestinos): Promise<string> {
  const destinoId = await resolverDestino(db, e.destino, e.pais_codigo, cache);
  const chave = nomeChave(e.nome);
  const { data: atual } = await db.from("eventos").select("*").eq("destino_id", destinoId).eq("nome_chave", chave).maybeSingle();
  if (atual) {
    const mudancas = preencherVazios(atual, { meses: e.meses });
    if (Object.keys(mudancas).length) await db.from("eventos").update(mudancas).eq("id", atual.id);
    return atual.id;
  }
  const r = await db
    .from("eventos")
    .insert({ destino_id: destinoId, nome: e.nome.trim(), nome_chave: chave, regra_data: e.regra_data, meses: e.meses })
    .select("id")
    .single();
  if (r.error) falhou("criar evento", r.error);
  await indexar(db, { tipo: "evento", id: r.data.id, destinoId, paisCodigo: e.pais_codigo, texto: textoBuscaEvento(e) });
  return r.data.id;
}

async function aprovarRoteiro(db: Db, rt: RoteiroExtraido, fonte: Fonte, cache: CacheDestinos): Promise<string> {
  const paises = [...new Set(rt.dias.map((d) => d.pais_codigo))];
  const r = await db
    .from("roteiros_base")
    .insert({
      titulo: rt.titulo,
      assinado: fonte.autoria === "propria" && fonte.tipo === "roteiro_proprio",
      autoria: fonte.autoria,
      fonte_id: fonte.id,
      duracao_dias: rt.duracao_dias,
      resumo: rt.resumo,
      epoca: rt.epoca,
      essencia: rt.essencia,
      paises,
    })
    .select("id")
    .single();
  if (r.error) falhou("criar roteiro", r.error);

  const dias: Database["public"]["Tables"]["roteiro_base_dias"]["Insert"][] = [];
  for (const d of rt.dias) {
    dias.push({
      roteiro_id: r.data.id,
      dia: d.dia,
      destino_id: await resolverDestino(db, d.cidade, d.pais_codigo, cache),
      cidade: d.cidade,
      pernoite: d.pernoite,
      atividades: d.atividades,
      deslocamento: d.deslocamento as Json,
      obs: d.obs,
    });
  }
  // Dias repetidos no texto: fica o primeiro
  const unicos = dias.filter((d, i) => dias.findIndex((x) => x.dia === d.dia) === i);
  const rd = await db.from("roteiro_base_dias").insert(unicos);
  if (rd.error) falhou("criar dias do roteiro", rd.error);
  await indexar(db, { tipo: "roteiro", id: r.data.id, destinoId: null, paisCodigo: paises[0] ?? null, texto: textoBuscaRoteiro(rt) });
  return r.data.id;
}

/**
 * Aprova um item (dados já editados pelo admin, se for o caso). Devolve o id do registro criado
 * ou mesclado. Lança AprovacaoError se os dados não passarem no schema.
 */
export async function aprovarItem(
  db: Db,
  item: { tipo: TipoItem; dados: unknown },
  fonte: Fonte & { viagem_mes: string | null },
  cache: CacheDestinos = new Map(),
): Promise<string> {
  const v = schemaDoItem(item.tipo).safeParse(item.dados);
  if (!v.success) {
    throw new AprovacaoError(v.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const anoRef = fonte.viagem_mes ? Number(fonte.viagem_mes.slice(0, 4)) : null;

  let id: string;
  switch (item.tipo) {
    case "destino":
      id = await aprovarDestino(db, v.data as DestinoExtraido, cache);
      break;
    case "lugar":
      id = await aprovarLugar(db, v.data as LugarExtraido, cache);
      break;
    case "trecho":
      id = await aprovarTrecho(db, v.data as TrechoExtraido, cache);
      break;
    case "dica":
      id = await aprovarDica(db, v.data as DicaExtraida, cache, anoRef);
      break;
    case "evento":
      id = await aprovarEvento(db, v.data as EventoExtraido, cache);
      break;
    case "roteiro":
      id = await aprovarRoteiro(db, v.data as RoteiroExtraido, fonte, cache);
      break;
  }
  const citacao = item.tipo === "roteiro" || item.tipo === "destino" ? null : ((v.data as { citacao?: string }).citacao ?? null);
  await citar(db, fonte.id, item.tipo, id, citacao);
  return id;
}
