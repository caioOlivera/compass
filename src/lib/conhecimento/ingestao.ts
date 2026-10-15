import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chamadorParaTarefa } from "@/lib/ai";
import { gerarJsonValidado } from "@/lib/ai/json";
import {
  dadosPessoaisNoItem,
  ExtracaoSchema,
  itensDaExtracao,
  type Extracao,
  type TipoItem,
} from "@/lib/conhecimento/extracao";
import { mensagemExtracao, PROMPT_EXTRACAO } from "@/lib/conhecimento/prompt-extracao";
import { nomeChave } from "@/lib/conhecimento/registros";
import type { Database, Json } from "@/types/database";
import { z } from "zod";

type Db = SupabaseClient<Database>;

export type TipoFonte = "relato_comunidade" | "roteiro_proprio" | "anotacao_propria" | "consultoria";
export const AUTORIA_DO_TIPO: Record<TipoFonte, "propria" | "terceiro"> = {
  relato_comunidade: "terceiro",
  roteiro_proprio: "propria",
  anotacao_propria: "propria",
  consultoria: "propria",
};

// Textos muito longos vão em partes para a IA; os resultados são somados.
const TAMANHO_PARTE = 45_000;

// ---------------------------------------------------------------------------------------------
// Texto do arquivo

export const EXTENSOES_ACEITAS = [".txt", ".md", ".csv", ".pdf", ".docx"] as const;

export function hashArquivo(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function extrairTexto(bytes: Uint8Array, nomeArquivo: string): Promise<string> {
  const ext = nomeArquivo.toLowerCase().slice(nomeArquivo.lastIndexOf("."));
  let texto: string;
  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    texto = (await extractText(pdf, { mergePages: true })).text;
  } else if (ext === ".docx") {
    const mammoth = await import("mammoth");
    texto = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  } else if ((EXTENSOES_ACEITAS as readonly string[]).includes(ext)) {
    texto = new TextDecoder("utf-8").decode(bytes);
  } else {
    throw new Error(`Formato não aceito (${ext}). Use ${EXTENSOES_ACEITAS.join(", ")}.`);
  }
  return limparTexto(texto);
}

export function limparTexto(texto: string): string {
  return texto
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Corta em partes de até `max` caracteres, preferindo quebras de parágrafo. */
export function dividirTexto(texto: string, max = TAMANHO_PARTE): string[] {
  if (texto.length <= max) return [texto];
  const partes: string[] = [];
  let resto = texto;
  while (resto.length > max) {
    let corte = resto.lastIndexOf("\n\n", max);
    if (corte < max * 0.5) corte = resto.lastIndexOf("\n", max);
    if (corte < max * 0.5) corte = max;
    partes.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) partes.push(resto);
  return partes;
}

/** Soma as extrações de várias partes do mesmo arquivo. */
export function juntarExtracoes(partes: Extracao[]): Extracao {
  const [primeira, ...demais] = partes;
  return demais.reduce<Extracao>(
    (acc, p) => ({
      fonte: { ...acc.fonte, paises: [...new Set([...acc.fonte.paises, ...p.fonte.paises])] },
      destinos: [...acc.destinos, ...p.destinos],
      lugares: [...acc.lugares, ...p.lugares],
      trechos: [...acc.trechos, ...p.trechos],
      dicas: [...acc.dicas, ...p.dicas],
      eventos: [...acc.eventos, ...p.eventos],
      roteiro: acc.roteiro ?? p.roteiro,
    }),
    primeira,
  );
}

// ---------------------------------------------------------------------------------------------
// IA

const TAREFA_EXTRACAO = {
  nome: "extracao",
  sistema: PROMPT_EXTRACAO,
  schema: z.toJSONSchema(ExtracaoSchema) as { [chave: string]: unknown },
};

export type ResultadoExtracao = { extracao: Extracao; modelo: string; inputTokens: number; outputTokens: number };

export async function extrairComIA(opcoes: {
  titulo: string;
  texto: string;
  autoria: "propria" | "terceiro";
}): Promise<ResultadoExtracao> {
  const provedor = chamadorParaTarefa(TAREFA_EXTRACAO);
  if (!provedor) throw new Error("A extração precisa de um provedor de IA (AI_PROVIDER não pode ser demo).");

  const resultados = [];
  for (const parte of dividirTexto(opcoes.texto)) {
    resultados.push(
      await gerarJsonValidado({
        chamar: provedor.chamar,
        schema: ExtracaoSchema,
        mensagem: mensagemExtracao({ ...opcoes, texto: parte }),
      }),
    );
  }
  return {
    extracao: juntarExtracoes(resultados.map((r) => r.dados)),
    modelo: provedor.descricao,
    inputTokens: resultados.reduce((s, r) => s + r.inputTokens, 0),
    outputTokens: resultados.reduce((s, r) => s + r.outputTokens, 0),
  };
}

// ---------------------------------------------------------------------------------------------
// Fila de revisão

/** Avisos para o revisor: dado pessoal suspeito e registro que já existe (vai ser mesclado). */
export async function avisosDosItens(db: Db, itens: { tipo: TipoItem; dados: unknown }[]): Promise<string[][]> {
  const nomesLugares = itens
    .filter((i) => i.tipo === "lugar")
    .map((i) => nomeChave((i.dados as { nome: string }).nome));
  const existentes = new Map<string, number>();
  if (nomesLugares.length) {
    const { data } = await db.from("lugares").select("nome_chave, mencoes").in("nome_chave", [...new Set(nomesLugares)]);
    for (const l of data ?? []) existentes.set(l.nome_chave, l.mencoes);
  }
  return itens.map((i) => {
    const avisos: string[] = [];
    const pessoais = dadosPessoaisNoItem(i.dados);
    if (pessoais.length) avisos.push(`Possível dado pessoal em: ${pessoais.join(", ")}`);
    if (i.tipo === "lugar") {
      const mencoes = existentes.get(nomeChave((i.dados as { nome: string }).nome));
      if (mencoes) avisos.push(`Já existe na base (${mencoes} ${mencoes === 1 ? "menção" : "menções"}): será mesclado`);
    }
    return avisos;
  });
}

/** Grava a fonte (se nova), a ingestão e os itens pendentes. Devolve o id da ingestão. */
export async function registrarIngestao(
  db: Db,
  opcoes: {
    fonte: {
      tipo: TipoFonte;
      titulo: string;
      arquivoNome: string | null;
      arquivoPath: string | null;
      mime: string | null;
      hash: string | null;
      texto: string;
    };
    extracao: Extracao;
    modelo: string;
    inputTokens: number;
    outputTokens: number;
    usuarioId: string | null;
  },
): Promise<string> {
  const f = opcoes.fonte;
  const fonte = await db
    .from("fontes")
    .insert({
      tipo: f.tipo,
      autoria: AUTORIA_DO_TIPO[f.tipo],
      titulo: (opcoes.extracao.fonte.titulo || f.titulo).slice(0, 200),
      arquivo_nome: f.arquivoNome,
      arquivo_path: f.arquivoPath,
      mime: f.mime,
      hash: f.hash,
      viagem_mes: opcoes.extracao.fonte.viagem_mes,
      texto: f.texto,
      criado_por: opcoes.usuarioId,
    })
    .select("id")
    .single();
  if (fonte.error) throw new Error(`Não foi possível gravar a fonte: ${fonte.error.message}`);

  const itens = itensDaExtracao(opcoes.extracao);
  const ingestao = await db
    .from("ingestoes")
    .insert({
      fonte_id: fonte.data.id,
      status: itens.length ? "revisao" : "concluida",
      modelo: opcoes.modelo,
      input_tokens: opcoes.inputTokens,
      output_tokens: opcoes.outputTokens,
      criado_por: opcoes.usuarioId,
    })
    .select("id")
    .single();
  if (ingestao.error) throw new Error(`Não foi possível gravar a ingestão: ${ingestao.error.message}`);

  if (itens.length) {
    const avisos = await avisosDosItens(db, itens);
    const r = await db.from("ingestao_itens").insert(
      itens.map((it, ordem) => ({
        ingestao_id: ingestao.data.id,
        ordem,
        tipo: it.tipo,
        dados: it.dados as Json,
        avisos: avisos[ordem],
      })),
    );
    if (r.error) throw new Error(`Não foi possível gravar os itens: ${r.error.message}`);
  }
  return ingestao.data.id;
}

/** Ingestão termina quando não sobra item pendente. */
export async function atualizarStatusIngestao(db: Db, ingestaoId: string) {
  const { count } = await db
    .from("ingestao_itens")
    .select("id", { count: "exact", head: true })
    .eq("ingestao_id", ingestaoId)
    .eq("decisao", "pendente");
  await db
    .from("ingestoes")
    .update({ status: count ? "revisao" : "concluida" })
    .eq("id", ingestaoId)
    .neq("status", "erro");
}
