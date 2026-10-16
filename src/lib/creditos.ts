import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lerConfig } from "@/lib/configuracoes";
import type { Database } from "@/types/database";

// Regras de crédito (livro-razão em `creditos`). Toda compra vira um lote com validade; todo uso
// consome 1 de um lote (o que vence primeiro). Nada é debitado sem registro.
// Com `cobranca_ativa` = false, gerar segue grátis (só o limite diário), como no lançamento.

type Db = SupabaseClient<Database>;

export type ProdutoAvulso = "roteiro" | "assinado" | "completo" | "consultoria";
export type Plano = "basic" | "premium";

export const PRODUTOS: Record<ProdutoAvulso, { titulo: string; descricao: string }> = {
  roteiro: { titulo: "Roteiro", descricao: "Roteiro dia a dia montado com a base de conhecimento, mapa, checklist e PDF." },
  assinado: { titulo: "Roteiro assinado", descricao: "Um roteiro feito e validado pelo consultor, adaptado às suas datas e preferências." },
  completo: { titulo: "Completo", descricao: "Roteiro + passagens recomendadas + hotéis + PDF." },
  consultoria: { titulo: "Consultoria pessoal", descricao: "Atendimento feito pelo consultor; o sistema registra o pedido e o briefing." },
};

export const PLANOS: Record<Plano, { titulo: string; descricao: string }> = {
  basic: { titulo: "Compass Basic", descricao: "30 consultas completas por mês, sem limite diário." },
  premium: { titulo: "Compass Premium", descricao: "Consultas sem limite declarado, com uso justo." },
};

export async function cobrancaAtiva(db: Db): Promise<boolean> {
  return (await lerConfig(db, "cobranca_ativa", false)) === true;
}

export async function precoDe(db: Db, produto: ProdutoAvulso | Plano): Promise<number> {
  const precos = await lerConfig<Record<string, number>>(db, "precos_produtos", {});
  const p = Number(precos[produto]);
  if (!Number.isFinite(p) || p <= 0) throw new Error(`Preço de ${produto} não configurado.`);
  return p;
}

function somarMeses(base: Date, meses: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + meses);
  return d;
}

/** Agência com plano ativo de quem pede (se houver). */
export async function planoDoUsuario(db: Db, userId: string): Promise<{ organizacaoId: string; plano: Plano | null } | null> {
  const { data: m } = await db.from("organizacao_membros").select("organizacao_id").eq("user_id", userId).maybeSingle();
  if (!m) return null;
  const { data: org } = await db.from("organizacoes").select("plano, plano_ativo_ate").eq("id", m.organizacao_id).maybeSingle();
  const ativo = org?.plano && org.plano_ativo_ate && new Date(org.plano_ativo_ate) > new Date();
  return { organizacaoId: m.organizacao_id, plano: ativo ? (org!.plano as Plano) : null };
}

export type ResultadoCredito =
  | { ok: true; usoId: string | null; gratis?: boolean; premium?: boolean }
  | { ok: false; status: 402 | 429; mensagem: string; comprar?: string };

/**
 * Antes de gerar: libera pelo lançamento grátis, pelo Premium da agência (com uso justo) ou
 * consumindo 1 crédito (da agência primeiro, depois o pessoal). Créditos "completo" servem para
 * qualquer consulta, menos consultoria.
 */
export async function exigirCredito(
  db: Db,
  p: { userId: string; produto: ProdutoAvulso; tripRequestId?: string | null; motivo?: "uso" | "ajuste_extra" },
): Promise<ResultadoCredito> {
  if (!(await cobrancaAtiva(db))) return { ok: true, usoId: null, gratis: true };

  const agencia = await planoDoUsuario(db, p.userId);
  if (agencia?.plano === "premium") {
    const uso = await lerConfig<{ alerta_mes: number; limite_hora: number }>(db, "uso_justo_premium", { alerta_mes: 150, limite_hora: 20 });
    const { data: membros } = await db.from("organizacao_membros").select("user_id").eq("organizacao_id", agencia.organizacaoId);
    const ids = (membros ?? []).map((m) => m.user_id);
    const umaHora = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await db.from("trip_requests").select("id", { count: "exact", head: true }).in("user_id", ids).gte("created_at", umaHora);
    if ((count ?? 0) > uso.limite_hora) {
      return { ok: false, status: 429, mensagem: "Muitas consultas na última hora. Tente de novo em alguns minutos." };
    }
    // Alerta interno de uso justo: só avisa (logs da Vercel), não bloqueia
    const inicioMes = new Date();
    inicioMes.setUTCDate(1);
    inicioMes.setUTCHours(0, 0, 0, 0);
    const { count: noMes } = await db.from("trip_requests").select("id", { count: "exact", head: true }).in("user_id", ids).gte("created_at", inicioMes.toISOString());
    if ((noMes ?? 0) >= uso.alerta_mes) console.warn(`[uso-justo] agência ${agencia.organizacaoId}: ${noMes} consultas no mês`);
    return { ok: true, usoId: null, premium: true };
  }

  // Primeiro o crédito do próprio produto; "completo" (mais caro) só quando não houver
  const tentativas = p.produto === "consultoria" || p.produto === "completo" ? [[p.produto]] : [[p.produto], ["completo"]];
  let usoId: string | null = null;
  for (const tipos of tentativas) {
    const { data } = await db.rpc("consumir_credito", {
      p_user_id: p.userId,
      p_organizacao_id: agencia?.organizacaoId ?? null,
      p_tipos: tipos,
      p_motivo: p.motivo ?? "uso",
      p_trip_request_id: p.tripRequestId ?? null,
    });
    usoId = data;
    if (usoId) break;
  }
  if (usoId) return { ok: true, usoId };
  return {
    ok: false,
    status: 402,
    mensagem: p.motivo === "ajuste_extra" ? "Os ajustes incluídos acabaram. Um novo ajuste consome um novo crédito." : "Você não tem créditos para este produto.",
    comprar: `/comprar?produto=${p.produto}`,
  };
}

/** Liga o uso ao pedido de viagem criado depois do consumo. */
export async function vincularUso(db: Db, usoId: string | null, tripRequestId: string) {
  if (usoId) await db.from("creditos").update({ trip_request_id: tripRequestId }).eq("id", usoId);
}

/** Geração falhou depois de consumir: devolve 1 crédito (novo lote com a mesma validade). */
export async function devolverCredito(db: Db, usoId: string | null) {
  if (!usoId) return;
  const { data: uso } = await db.from("creditos").select("user_id, organizacao_id, tipo, lote_id, trip_request_id").eq("id", usoId).maybeSingle();
  if (!uso?.lote_id) return;
  const { data: lote } = await db.from("creditos").select("valido_ate").eq("id", uso.lote_id).maybeSingle();
  await db.from("creditos").insert({
    user_id: uso.user_id,
    organizacao_id: uso.organizacao_id,
    tipo: uso.tipo,
    quantidade: 1,
    motivo: "cortesia",
    trip_request_id: uso.trip_request_id,
    valido_ate: lote?.valido_ate ?? null,
  });
}

/** Pagamento aprovado: marca o pedido como pago (uma vez só) e libera o crédito. */
export async function liberarPedido(db: Db, pedidoId: string, extra: { provedorId?: string; metodo?: string } = {}): Promise<boolean> {
  const { data: pedido } = await db
    .from("pedidos")
    .update({ status: "pago", pago_em: new Date().toISOString(), provedor_id: extra.provedorId ?? null, metodo: extra.metodo ?? null })
    .eq("id", pedidoId)
    .eq("status", "pendente")
    .select("id, user_id, produto")
    .maybeSingle();
  if (!pedido) return false; // já processado (ou não existe)

  if (pedido.produto === "basic" || pedido.produto === "premium") return true;
  const meses = Number(await lerConfig(db, "validade_meses_b2c", 12));
  await db.from("creditos").insert({
    user_id: pedido.user_id,
    tipo: pedido.produto,
    quantidade: 1,
    motivo: "compra",
    pedido_id: pedido.id,
    valido_ate: somarMeses(new Date(), meses).toISOString(),
  });
  if (pedido.produto === "consultoria") {
    await db.from("consultorias").insert({ pedido_id: pedido.id, user_id: pedido.user_id });
  }
  return true;
}

/** Estorno: o pedido vira estornado e o que restava do crédito sai do saldo. */
export async function estornarPedido(db: Db, pedidoId: string): Promise<void> {
  const { data: pedido } = await db.from("pedidos").update({ status: "estornado" }).eq("id", pedidoId).eq("status", "pago").select("id").maybeSingle();
  if (!pedido) return;
  const { data: lotes } = await db.from("creditos").select("id").eq("pedido_id", pedidoId).gt("quantidade", 0);
  for (const l of lotes ?? []) {
    const { data: lote } = await db.from("creditos_lotes").select("restante, user_id, organizacao_id, tipo").eq("id", l.id).maybeSingle();
    if (lote?.restante && lote.restante > 0) {
      await db.from("creditos").insert({
        user_id: lote.user_id,
        organizacao_id: lote.organizacao_id,
        tipo: lote.tipo!,
        quantidade: -lote.restante,
        motivo: "reembolso",
        lote_id: l.id,
        pedido_id: pedidoId,
      });
    }
  }
}

/** Mensalidade paga do Basic: lote de N créditos "completo" para a agência, válido até o fim do período. */
export async function creditarMensalidade(db: Db, organizacaoId: string, validoAte: Date) {
  const n = Number(await lerConfig(db, "creditos_basic_mes", 30));
  await db.from("creditos").insert({
    organizacao_id: organizacaoId,
    tipo: "completo",
    quantidade: n,
    motivo: "plano_mensal",
    valido_ate: validoAte.toISOString(),
  });
}

export { somarMeses };

export type Saldo = Partial<Record<ProdutoAvulso, number>>;

/** Créditos válidos por tipo (pessoais, ou da agência quando `organizacaoId`). Lê com a sessão de quem pede. */
export async function saldo(db: Db, dono: { userId?: string; organizacaoId?: string }): Promise<Saldo> {
  let q = db.from("creditos_lotes").select("tipo, restante, valido_ate").gt("restante", 0);
  q = dono.organizacaoId ? q.eq("organizacao_id", dono.organizacaoId) : q.eq("user_id", dono.userId!);
  const { data } = await q;
  const agora = Date.now();
  const total: Saldo = {};
  for (const l of data ?? []) {
    if (l.valido_ate && new Date(l.valido_ate).getTime() <= agora) continue;
    const t = l.tipo as ProdutoAvulso;
    total[t] = (total[t] ?? 0) + (l.restante ?? 0);
  }
  return total;
}

export const NOME_STATUS_PEDIDO: Record<string, string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  estornado: "Reembolsado",
  expirado: "Expirado",
};
