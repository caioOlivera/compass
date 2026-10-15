"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin";
import { aprovarItem, AprovacaoError, type CacheDestinos } from "@/lib/conhecimento/aprovar";
import { indexarPendentes } from "@/lib/conhecimento/busca";
import { TIPOS_ITEM, type TipoItem } from "@/lib/conhecimento/extracao";
import {
  atualizarStatusIngestao,
  extrairComIA,
  extrairTexto,
  hashArquivo,
  registrarIngestao,
  AUTORIA_DO_TIPO,
  type TipoFonte,
} from "@/lib/conhecimento/ingestao";
import { registrarUso } from "@/lib/medicao";
import type { Json } from "@/types/database";

// Ações do painel da base de conhecimento. Todas exigem admin e usam a sessão dele (a RLS
// também só deixa admin ler e gravar essas tabelas).

const TIPOS_FONTE: TipoFonte[] = ["relato_comunidade", "roteiro_proprio", "anotacao_propria", "consultoria"];

export type ResultadoProcessamento =
  | { estado: "ok"; ingestaoId: string; itens: number; titulo: string }
  | { estado: "duplicado"; titulo: string }
  | { estado: "erro"; mensagem: string };

/** O arquivo já foi enviado ao bucket "fontes" pelo navegador; aqui vira texto, extração e fila. */
export async function processarFonte(entrada: { caminho: string; nome: string; tipo: TipoFonte }): Promise<ResultadoProcessamento> {
  const { supabase, user } = await exigirAdmin();
  if (!TIPOS_FONTE.includes(entrada.tipo)) return { estado: "erro", mensagem: "Tipo de fonte inválido." };

  try {
    const { data: arquivo, error } = await supabase.storage.from("fontes").download(entrada.caminho);
    if (error || !arquivo) return { estado: "erro", mensagem: "Não foi possível ler o arquivo enviado." };
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const hash = hashArquivo(bytes);

    const { data: existente } = await supabase.from("fontes").select("titulo").eq("hash", hash).maybeSingle();
    if (existente) {
      await supabase.storage.from("fontes").remove([entrada.caminho]);
      return { estado: "duplicado", titulo: existente.titulo };
    }

    const texto = await extrairTexto(bytes, entrada.nome);
    if (texto.length < 50) return { estado: "erro", mensagem: "O arquivo quase não tem texto (PDF escaneado?)." };

    const titulo = entrada.nome.replace(/\.[^.]+$/, "");
    const r = await extrairComIA({ titulo, texto, autoria: AUTORIA_DO_TIPO[entrada.tipo] });
    await registrarUso(supabase, {
      tipo: "extracao",
      userId: user.id,
      modelo: r.modelo,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      meta: { arquivo: entrada.nome },
    });
    const ingestaoId = await registrarIngestao(supabase, {
      fonte: { tipo: entrada.tipo, titulo, arquivoNome: entrada.nome, arquivoPath: entrada.caminho, mime: arquivo.type || null, hash, texto },
      extracao: r.extracao,
      modelo: r.modelo,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      usuarioId: user.id,
    });
    revalidatePath("/admin/base");
    const itens =
      r.extracao.destinos.length +
      r.extracao.lugares.length +
      r.extracao.trechos.length +
      r.extracao.dicas.length +
      r.extracao.eventos.length +
      (r.extracao.roteiro ? 1 : 0);
    return { estado: "ok", ingestaoId, itens, titulo: r.extracao.fonte.titulo || titulo };
  } catch (e) {
    return { estado: "erro", mensagem: e instanceof Error ? e.message.slice(0, 300) : "Falha ao processar." };
  }
}

export type ResultadoRevisao = { aprovados: number; rejeitados: number; erros: { id: string; mensagem: string }[]; indexados: number };

/**
 * Aprova itens (com os dados editados, se vierem) na ordem da fila: destinos antes do resto.
 * Cada item é independente: um erro não desfaz os outros.
 */
export async function aprovarItens(entrada: { ids: string[]; edicoes?: Record<string, unknown> }): Promise<ResultadoRevisao> {
  const { supabase, user } = await exigirAdmin();
  const resultado: ResultadoRevisao = { aprovados: 0, rejeitados: 0, erros: [], indexados: 0 };
  if (!entrada.ids.length) return resultado;

  const { data: itens, error } = await supabase
    .from("ingestao_itens")
    .select("id, tipo, dados, ingestao_id, decisao, ingestoes(fonte_id, fontes(id, autoria, tipo, viagem_mes))")
    .in("id", entrada.ids.slice(0, 500))
    .eq("decisao", "pendente")
    .order("ordem");
  if (error) return { ...resultado, erros: [{ id: "-", mensagem: error.message }] };

  const ordem = (t: string) => TIPOS_ITEM.indexOf(t as TipoItem);
  const cache: CacheDestinos = new Map();
  const ingestoes = new Set<string>();

  for (const item of [...(itens ?? [])].sort((a, b) => ordem(a.tipo) - ordem(b.tipo))) {
    const fonte = item.ingestoes?.fontes;
    if (!fonte) {
      resultado.erros.push({ id: item.id, mensagem: "Fonte não encontrada." });
      continue;
    }
    const dados = entrada.edicoes?.[item.id] ?? item.dados;
    try {
      const registroId = await aprovarItem(supabase, { tipo: item.tipo as TipoItem, dados }, fonte, cache);
      await supabase
        .from("ingestao_itens")
        .update({
          decisao: "aprovado",
          registro_id: registroId,
          dados: dados as Json,
          revisado_por: user.id,
          revisado_em: new Date().toISOString(),
        })
        .eq("id", item.id);
      resultado.aprovados++;
      ingestoes.add(item.ingestao_id);
    } catch (e) {
      resultado.erros.push({ id: item.id, mensagem: e instanceof AprovacaoError || e instanceof Error ? e.message : "Erro ao aprovar." });
    }
  }

  for (const id of ingestoes) await atualizarStatusIngestao(supabase, id);
  try {
    resultado.indexados = await indexarPendentes(supabase);
  } catch {
    // sem embeddings agora; o botão "Gerar embeddings" na busca tenta de novo
  }
  revalidatePath("/admin/base", "layout");
  return resultado;
}

export async function rejeitarItens(ids: string[]): Promise<ResultadoRevisao> {
  const { supabase, user } = await exigirAdmin();
  const { data } = await supabase
    .from("ingestao_itens")
    .update({ decisao: "rejeitado", revisado_por: user.id, revisado_em: new Date().toISOString() })
    .in("id", ids.slice(0, 500))
    .eq("decisao", "pendente")
    .select("ingestao_id");
  for (const id of new Set((data ?? []).map((d) => d.ingestao_id))) await atualizarStatusIngestao(supabase, id);
  revalidatePath("/admin/base", "layout");
  return { aprovados: 0, rejeitados: data?.length ?? 0, erros: [], indexados: 0 };
}

export async function gerarEmbeddingsPendentes(): Promise<{ indexados: number; erro?: string }> {
  const { supabase } = await exigirAdmin();
  try {
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const n = await indexarPendentes(supabase);
      total += n;
      if (n === 0) break;
    }
    revalidatePath("/admin/base/busca");
    return { indexados: total };
  } catch (e) {
    return { indexados: 0, erro: e instanceof Error ? e.message : "Falha" };
  }
}

/** Aprova de uma vez os itens pendentes de uma fonte que não têm aviso de dado pessoal. */
export async function aprovarFonte(ingestaoId: string): Promise<ResultadoRevisao> {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase
    .from("ingestao_itens")
    .select("id, avisos")
    .eq("ingestao_id", ingestaoId)
    .eq("decisao", "pendente");
  const ids = (data ?? []).filter((i) => !i.avisos.some((a) => a.startsWith("Possível dado pessoal"))).map((i) => i.id);
  return aprovarItens({ ids });
}
