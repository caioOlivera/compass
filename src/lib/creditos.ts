import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lerConfig } from "@/lib/configuracoes";
import { hashEmail } from "@/lib/lgpd";
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
  consultoria: {
    titulo: "Consultoria pessoal",
    descricao: "Sua viagem montada pelo consultor, com contato direto e suporte 24 horas pelo WhatsApp, do planejamento até a volta.",
  },
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
  | {
      ok: true;
      usoId: string | null;
      /** O roteiro sai com passagens e hotéis (completo, plano de agência ou acesso cortesia) */
      completo: boolean;
      origem: "lancamento" | "cortesia" | "plano" | "credito";
      /** Lançamento grátis: vale o limite diário de gerações */
      gratis?: boolean;
    }
  | { ok: false; status: 402 | 429; mensagem: string; comprar?: string };

/** Acesso gratuito concedido pelo admin (por e-mail ou conta), ainda válido e não revogado. */
export async function acessoGratisAtivo(db: Db, userId: string, email?: string | null) {
  const agora = new Date().toISOString();
  const ativos = () => db.from("acessos_gratis").select("id, valido_ate, motivo").is("revogado_em", null).or(`valido_ate.is.null,valido_ate.gt.${agora}`).limit(1);
  const { data: porConta } = await ativos().eq("user_id", userId);
  if (porConta?.length) return porConta[0];
  // Concedido antes de a pessoa criar a conta: o e-mail é guardado em minúsculas
  if (!email) return null;
  const { data: porEmail } = await ativos().eq("email", email.trim().toLowerCase());
  return porEmail?.[0] ?? null;
}

/** Toda conta ganha 1 roteiro grátis (sem passagens e hotéis), uma vez só. */
export async function garantirBoasVindas(db: Db, userId: string, email?: string | null) {
  if ((await lerConfig(db, "roteiro_boas_vindas", true)) !== true) return;
  // Quem excluiu a conta e voltou com o mesmo e-mail já recebeu o seu
  if (email) {
    const { data: excluida } = await db.from("contas_excluidas").select("email_hash").eq("email_hash", hashEmail(email)).maybeSingle();
    if (excluida) return;
  }
  const { data } = await db.from("boas_vindas").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true }).select("user_id");
  if (!data?.length) return; // já recebeu
  const meses = Number(await lerConfig(db, "validade_meses_b2c", 12));
  await db.from("creditos").insert({ user_id: userId, tipo: "roteiro", quantidade: 1, motivo: "cortesia", valido_ate: somarMeses(new Date(), meses).toISOString() });
}

/** Limite por hora de quem gera sem crédito (Premium e cortesia): contra automação. */
async function dentroDoUsoJusto(db: Db, ids: string[]): Promise<boolean> {
  const uso = await lerConfig<{ alerta_mes: number; limite_hora: number }>(db, "uso_justo_premium", { alerta_mes: 150, limite_hora: 20 });
  const umaHora = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("trip_requests").select("id", { count: "exact", head: true }).in("user_id", ids).gte("created_at", umaHora);
  return (count ?? 0) <= uso.limite_hora;
}

const MUITAS = { ok: false as const, status: 429 as const, mensagem: "Muitas consultas na última hora. Tente de novo em alguns minutos." };

/**
 * Antes de gerar. Ordem: acesso cortesia do admin → lançamento grátis (cobrança desligada) →
 * Premium da agência (uso justo) → créditos (agência primeiro). Plano de agência e cortesia geram
 * sempre com passagens e hotéis; nos créditos, o produto pedido decide.
 */
export async function exigirCredito(
  db: Db,
  p: { userId: string; email?: string | null; produto: ProdutoAvulso; tripRequestId?: string | null; motivo?: "uso" | "ajuste_extra" },
): Promise<ResultadoCredito> {
  if (await acessoGratisAtivo(db, p.userId, p.email)) {
    return (await dentroDoUsoJusto(db, [p.userId])) ? { ok: true, usoId: null, completo: true, origem: "cortesia" } : MUITAS;
  }
  if (!(await cobrancaAtiva(db))) return { ok: true, usoId: null, completo: false, origem: "lancamento", gratis: true };

  const agencia = await planoDoUsuario(db, p.userId);
  if (agencia?.plano === "premium") {
    const { data: membros } = await db.from("organizacao_membros").select("user_id").eq("organizacao_id", agencia.organizacaoId);
    const ids = (membros ?? []).map((m) => m.user_id);
    if (!(await dentroDoUsoJusto(db, ids))) return MUITAS;
    // Alerta interno de uso justo: só avisa (logs da Vercel), não bloqueia
    const uso = await lerConfig<{ alerta_mes: number }>(db, "uso_justo_premium", { alerta_mes: 150 });
    const inicioMes = new Date();
    inicioMes.setUTCDate(1);
    inicioMes.setUTCHours(0, 0, 0, 0);
    const { count: noMes } = await db.from("trip_requests").select("id", { count: "exact", head: true }).in("user_id", ids).gte("created_at", inicioMes.toISOString());
    if ((noMes ?? 0) >= uso.alerta_mes) console.warn(`[uso-justo] agência ${agencia.organizacaoId}: ${noMes} consultas no mês`);
    return { ok: true, usoId: null, completo: true, origem: "plano" };
  }

  await garantirBoasVindas(db, p.userId, p.email);

  // Basic: os créditos da agência são "completo". Assinado aceita o próprio crédito ou um completo.
  const tentativas =
    agencia?.plano === "basic" && p.produto !== "consultoria"
      ? p.produto === "assinado"
        ? [["assinado"], ["completo"]]
        : [["completo"]]
      : p.produto === "assinado"
        ? [["assinado"], ["completo"]]
        : [[p.produto]];
  for (const tipos of tentativas) {
    const { data: usoId } = await db.rpc("consumir_credito", {
      p_user_id: p.userId,
      p_organizacao_id: agencia?.organizacaoId ?? null,
      p_tipos: tipos,
      p_motivo: p.motivo ?? "uso",
      p_trip_request_id: p.tripRequestId ?? null,
    });
    if (usoId) return { ok: true, usoId, completo: tipos[0] === "completo", origem: "credito" };
  }
  return {
    ok: false,
    status: 402,
    mensagem: p.motivo === "ajuste_extra" ? "Os ajustes incluídos acabaram. Um novo ajuste consome um novo crédito." : "Você não tem créditos para este produto.",
    comprar: `/comprar?produto=${p.produto}`,
  };
}

export type OpcoesGeracao = {
  /** cortesia/plano: tudo liberado com passagens e hotéis; lancamento: grátis sem passagens; creditos: escolhe */
  modo: "cortesia" | "plano" | "lancamento" | "creditos";
  roteiro: number;
  completo: number;
  assinado: number;
};

/** O que a pessoa pode gerar agora (para o questionário mostrar a escolha certa). */
export async function opcoesDeGeracao(db: Db, userId: string, email?: string | null): Promise<OpcoesGeracao> {
  const zero = { roteiro: 0, completo: 0, assinado: 0 };
  if (await acessoGratisAtivo(db, userId, email)) return { modo: "cortesia", ...zero };
  if (!(await cobrancaAtiva(db))) return { modo: "lancamento", ...zero };
  const agencia = await planoDoUsuario(db, userId);
  if (agencia?.plano === "premium") return { modo: "plano", ...zero };
  await garantirBoasVindas(db, userId);
  const meu = await saldo(db, { userId });
  const daAgencia = agencia?.plano === "basic" ? await saldo(db, { organizacaoId: agencia.organizacaoId }) : {};
  if (agencia?.plano === "basic") return { modo: "plano", roteiro: 0, completo: daAgencia.completo ?? 0, assinado: 0 };
  return { modo: "creditos", roteiro: meu.roteiro ?? 0, completo: meu.completo ?? 0, assinado: meu.assinado ?? 0 };
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
