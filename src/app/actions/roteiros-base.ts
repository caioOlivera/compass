"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { lerConfig } from "@/lib/configuracoes";
import { aplicarRevisao, revisoesPendentes, type CamposRoteiro, type Deslocamento } from "@/lib/conhecimento/revisao-roteiro";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

// Edição de um roteiro pronto (assinado ou da comunidade) pelo painel.

const DeslocamentoSchema = z
  .object({
    meio: z.string().trim().max(60),
    de: z.string().trim().max(120),
    para: z.string().trim().max(120),
    obs: z.string().trim().max(400).nullable().default(null),
  })
  .nullable();

const DiaSchema = z.object({
  dia: z.int().min(1).max(120),
  cidade: z.string().trim().min(1, "Toda linha precisa de cidade").max(120),
  atividades: z.array(z.string().trim().min(1).max(300)).max(20),
  deslocamento: DeslocamentoSchema,
  obs: z.string().trim().max(400).nullable(),
});

const RoteiroSchema = z.object({
  titulo: z.string().trim().min(3).max(120),
  auge: z.string().trim().max(120).nullable().default(null),
  resumo: z.string().trim().min(10).max(2000),
  epoca: z.string().trim().max(200).nullable(),
  essencia: z.array(z.string().trim().min(2).max(300)).max(15),
  paises: z.array(z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Países em código de 2 letras (ex.: IT, TH)")).min(1).max(15),
  dias: z.array(DiaSchema).min(1).max(120),
});
export type RoteiroEditavel = z.input<typeof RoteiroSchema>;

export async function salvarRoteiroBase(id: string, dados: RoteiroEditavel, comRevisao = false): Promise<{ ok: boolean; mensagem: string }> {
  await exigirAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, mensagem: "Roteiro inválido." };
  const db = createAdminClient();
  const r = await gravarRoteiro(db, id, dados);
  if (r.ok && comRevisao) await marcarRevisaoAplicada(db, id);
  if (r.ok) revalidarRoteiro(id);
  return r;
}

/** Registra que as revisões sugeridas deste roteiro já entraram (somem do aviso). */
async function marcarRevisaoAplicada(db: Db, id: string) {
  const [{ data: cfgs }, aplicadas] = await Promise.all([
    db.from("configuracoes").select("chave, valor").like("chave", "revisao_assinados%"),
    lerConfig<Record<string, string[]>>(db, "revisoes_aplicadas", {}),
  ]);
  aplicadas[id] = (cfgs ?? []).filter((c) => id in ((c.valor ?? {}) as object)).map((c) => c.chave);
  await db.from("configuracoes").upsert({ chave: "revisoes_aplicadas", valor: aplicadas as Json });
}

function revalidarRoteiro(id: string) {
  revalidatePath("/admin/base/roteiros");
  revalidatePath("/roteiros-assinados");
  revalidatePath(`/roteiros-assinados/${id}`);
  revalidatePath("/");
}

type Db = ReturnType<typeof createAdminClient>;

async function gravarRoteiro(db: Db, id: string, dados: RoteiroEditavel): Promise<{ ok: boolean; mensagem: string }> {
  const r = RoteiroSchema.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Confira os campos." };

  const { data: atuais } = await db.from("roteiro_base_dias").select("id, dia, cidade, destino_id").eq("roteiro_id", id);
  const porDia = new Map((atuais ?? []).map((d) => [d.dia, d]));

  // Cidade trocada: reaproveita o destino de outro dia com a mesma cidade, senão procura na base
  const destinoDaCidade = async (cidade: string): Promise<string | null> => {
    const mesmo = (atuais ?? []).find((d) => d.cidade.toLowerCase() === cidade.toLowerCase() && d.destino_id);
    if (mesmo) return mesmo.destino_id;
    const { data } = await db.from("destinos").select("id").eq("tipo", "cidade").ilike("nome", cidade).limit(1).maybeSingle();
    return data?.id ?? null;
  };

  // Dias numerados em sequência a partir de 1: a duração do roteiro passa a ser o número de dias
  const dias = [...r.data.dias].sort((a, b) => a.dia - b.dia).map((d, i) => ({ ...d, dia: i + 1 }));
  for (const d of dias) {
    const atual = porDia.get(d.dia);
    const destino_id = atual && atual.cidade === d.cidade ? atual.destino_id : await destinoDaCidade(d.cidade);
    const linha = { cidade: d.cidade, destino_id, atividades: d.atividades, deslocamento: d.deslocamento as Json, obs: d.obs || null };
    const { error } = atual
      ? await db.from("roteiro_base_dias").update(linha).eq("id", atual.id)
      : await db.from("roteiro_base_dias").insert({ ...linha, roteiro_id: id, dia: d.dia });
    if (error) return { ok: false, mensagem: `Não foi possível salvar o dia ${d.dia}.` };
  }
  const sobrando = (atuais ?? []).filter((d) => d.dia > dias.length).map((d) => d.id);
  if (sobrando.length) await db.from("roteiro_base_dias").delete().in("id", sobrando);

  const { error } = await db
    .from("roteiros_base")
    .update({ titulo: r.data.titulo, auge: r.data.auge || null, resumo: r.data.resumo, epoca: r.data.epoca || null, essencia: r.data.essencia, paises: r.data.paises, duracao_dias: dias.length })
    .eq("id", id);
  if (error) return { ok: false, mensagem: "Não foi possível salvar o roteiro." };
  return { ok: true, mensagem: "Roteiro salvo." };
}

/** Aplica de uma vez todas as revisões sugeridas que ainda não foram aplicadas. */
export async function aplicarRevisoesPendentes(): Promise<{ ok: boolean; mensagem: string }> {
  await exigirAdmin();
  const db = createAdminClient();
  const [{ data: cfgs }, aplicadas] = await Promise.all([
    db.from("configuracoes").select("chave, valor").like("chave", "revisao_assinados%"),
    lerConfig<Record<string, string[]>>(db, "revisoes_aplicadas", {}),
  ]);
  const { revisoes, pendentes } = revisoesPendentes(cfgs ?? [], aplicadas);
  const feitos: string[] = [];
  const falhas: string[] = [];
  for (const id of pendentes) {
    const { data: rt } = await db
      .from("roteiros_base")
      .select("titulo, auge, resumo, epoca, essencia, paises, roteiro_base_dias(dia, cidade, atividades, deslocamento, obs)")
      .eq("id", id)
      .maybeSingle();
    if (!rt) continue;
    const atual: CamposRoteiro = {
      ...rt,
      dias: [...(rt.roteiro_base_dias ?? [])].sort((a, b) => a.dia - b.dia).map((d) => ({ ...d, deslocamento: d.deslocamento as Deslocamento })),
    };
    const novo = aplicarRevisao(atual, revisoes[id]);
    const r = await gravarRoteiro(db, id, novo);
    if (r.ok) {
      aplicadas[id] = (cfgs ?? []).filter((c) => id in ((c.valor ?? {}) as object)).map((c) => c.chave);
      feitos.push(novo.titulo);
      revalidarRoteiro(id);
    } else falhas.push(`${rt.titulo}: ${r.mensagem}`);
  }
  await db.from("configuracoes").upsert({ chave: "revisoes_aplicadas", valor: aplicadas as Json });
  if (falhas.length) return { ok: false, mensagem: `Aplicadas: ${feitos.length}. Com erro: ${falhas.join("; ")}` };
  return { ok: true, mensagem: feitos.length ? `Revisões aplicadas: ${feitos.join(", ")}.` : "Nada pendente." };
}
