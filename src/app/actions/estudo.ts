"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { CIDADES_ESTUDO_HOTEL, consultaSerpApi, ROTAS_ESTUDO, variantesTravelpayouts } from "@/lib/viagem/estudo-rotas";
import { serpapiConfigurada, serpapiHoteis, serpapiVoos, travelpayoutsConfigurado, travelpayoutsVoos } from "@/lib/viagem/provedores";
import type { ConsultaVoo, OfertaHotel, OfertaVoo, ProvedorVoos } from "@/lib/viagem/tipos";

// Estudo das rotas (Fase 2) e mini-estudo de hotéis (Fase 3). Chama as APIs direto, sem o cache,
// para medir de verdade; cada consulta vira uma linha em estudo_rotas.

type Resultado = { ok: true; mensagem: string } | { ok: false; mensagem: string };

async function emLotes<T>(itens: T[], tamanho: number, f: (x: T) => Promise<void>) {
  for (let i = 0; i < itens.length; i += tamanho) await Promise.all(itens.slice(i, i + tamanho).map(f));
}

async function medir<T>(f: () => Promise<T[]>) {
  const inicio = Date.now();
  try {
    const ofertas = await f();
    return { ofertas, latencia: Date.now() - inicio, erro: null as string | null };
  } catch (e) {
    return { ofertas: [] as T[], latencia: Date.now() - inicio, erro: e instanceof Error ? e.message.slice(0, 300) : "erro" };
  }
}

export async function rodarEstudoVoos(incluirSerpApi: boolean): Promise<Resultado> {
  await exigirAdmin();
  if (!travelpayoutsConfigurado() && !serpapiConfigurada()) return { ok: false, mensagem: "Configure TRAVELPAYOUTS_TOKEN ou SERPAPI_KEY na Vercel." };
  const db = createAdminClient();
  const rodada = crypto.randomUUID();

  const tarefas: { rota: number; provedor: ProvedorVoos; variante: string; consulta: ConsultaVoo }[] = [];
  for (const r of ROTAS_ESTUDO) {
    if (travelpayoutsConfigurado()) for (const v of variantesTravelpayouts(r)) tarefas.push({ rota: r.n, provedor: travelpayoutsVoos, variante: v.nome, consulta: v.consulta });
    if (incluirSerpApi && serpapiConfigurada()) tarefas.push({ rota: r.n, provedor: serpapiVoos, variante: "data exata", consulta: consultaSerpApi(r) });
  }

  await emLotes(tarefas, 5, async (t) => {
    const m = await medir<OfertaVoo>(() => t.provedor.buscar(t.consulta));
    const o = m.ofertas[0];
    await db.from("estudo_rotas").insert({
      rodada,
      rota: t.rota,
      provedor: t.provedor.nome,
      variante: t.variante,
      origem: t.consulta.origem,
      destino: t.consulta.destino,
      ida: t.consulta.ida.length === 7 ? `${t.consulta.ida}-01` : t.consulta.ida,
      volta: t.consulta.volta ? (t.consulta.volta.length === 7 ? `${t.consulta.volta}-01` : t.consulta.volta) : null,
      encontrou: m.ofertas.length > 0,
      ofertas: m.ofertas.length,
      preco_brl: o?.preco_brl ?? null,
      latencia_ms: m.latencia,
      erro: m.erro,
      detalhe: (o ? { companhia: o.companhia, escalas: o.escalas, partida: o.partida, link: o.link } : null) as Json,
    });
  });
  revalidatePath("/admin/estudo");
  return { ok: true, mensagem: `${tarefas.length} consultas feitas.` };
}

export async function rodarEstudoHoteis(): Promise<Resultado> {
  await exigirAdmin();
  if (!serpapiConfigurada()) return { ok: false, mensagem: "Configure SERPAPI_KEY na Vercel." };
  const db = createAdminClient();
  const rodada = crypto.randomUUID();
  await emLotes(CIDADES_ESTUDO_HOTEL.map((c, i) => ({ ...c, i })), 5, async (c) => {
    const m = await medir<OfertaHotel>(() => serpapiHoteis.buscar({ cidade: c.cidade, checkin: c.checkin, checkout: c.checkout, adultos: 2 }));
    const comPreco = m.ofertas.filter((h) => h.diaria_brl != null);
    const doBooking = m.ofertas.filter((h) => h.fonte_preco === "Booking.com").length;
    await db.from("estudo_rotas").insert({
      rodada,
      rota: 100 + c.i,
      provedor: "serpapi_hoteis",
      variante: c.cidade,
      origem: "-",
      destino: c.cidade,
      ida: c.checkin,
      volta: c.checkout,
      encontrou: comPreco.length > 0,
      ofertas: m.ofertas.length,
      preco_brl: comPreco.length ? Math.min(...comPreco.map((h) => h.diaria_brl!)) : null,
      latencia_ms: m.latencia,
      erro: m.erro,
      detalhe: { com_preco: comPreco.length, preco_do_booking: doBooking, exemplos: comPreco.slice(0, 3).map((h) => `${h.nome} · R$ ${h.diaria_brl}`) } as Json,
    });
  });
  revalidatePath("/admin/estudo");
  return { ok: true, mensagem: `${CIDADES_ESTUDO_HOTEL.length} cidades consultadas.` };
}
