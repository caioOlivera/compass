import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { gerarComProvedorConfigurado } from "@/lib/ai";
import { GeracaoError } from "@/lib/ai/generate";
import { serverEnv } from "@/lib/env";
import { devolverCredito, exigirCredito, vincularUso } from "@/lib/creditos";
import { registrarUso } from "@/lib/medicao";
import { carregarRoteiroAssinado } from "@/lib/motor/assinado";
import { EscolhasAssinadoSchema, pedidoDoAssinado } from "@/lib/motor/assinado-pedido";
import { montarContextoBase } from "@/lib/motor/contexto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toPromptInput, toTripRequestRow } from "@/lib/validation/trip-request";

export const maxDuration = 300;

/**
 * POST /api/roteiros-assinados/[id]/gerar  { data_inicio, cidade_origem, adultos, criancas, orcamento, ritmo_viagem, observacoes }
 * Adapta um roteiro assinado às datas e preferências do cliente.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return erro(404, "Roteiro não encontrado.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro(401, "Entre para continuar.");

  const escolhas = EscolhasAssinadoSchema.safeParse(await req.json().catch(() => null));
  if (!escolhas.success) {
    return NextResponse.json({ error: "Revise as escolhas.", campos: z.flattenError(escolhas.error).fieldErrors }, { status: 400 });
  }
  if (escolhas.data.data_inicio < new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "A data de saída já passou.", campos: { data_inicio: ["Escolha uma data a partir de hoje"] } }, { status: 400 });
  }

  const admin = createAdminClient();
  const env = serverEnv();
  const base = await carregarRoteiroAssinado(admin, id);
  if (!base) return erro(404, "Roteiro não encontrado.");

  let input;
  try {
    input = pedidoDoAssinado(base, escolhas.data);
  } catch {
    return erro(500, "Este roteiro ainda não está pronto para adaptação (faltam coordenadas das cidades).");
  }

  const credito = await exigirCredito(admin, { userId: user.id, produto: "assinado" });
  if (!credito.ok) {
    const comprar = `/comprar?produto=assinado&roteiro=${id}`;
    return NextResponse.json({ error: credito.mensagem, comprar: credito.status === 402 ? comprar : undefined }, { status: credito.status });
  }
  if (credito.gratis) {
    const { data: usadas } = await admin.rpc("generations_last_24h", { p_user_id: user.id });
    if ((usadas ?? 0) >= env.DAILY_GENERATION_LIMIT) return erro(429, "Você atingiu o limite de roteiros por dia. Tente mais tarde.");
  }

  // Gravado pelo servidor: produto e roteiro de origem não vêm do cliente
  const { data: pedido, error: erroPedido } = await admin
    .from("trip_requests")
    .insert({ ...toTripRequestRow(input), user_id: user.id, product: "assinado", base_itinerary_id: base.id, status: "generating" })
    .select("id")
    .single();
  if (erroPedido) {
    console.error("[assinado] pedido", erroPedido);
    await devolverCredito(admin, credito.usoId);
    return erro(500, "Erro inesperado. Tente de novo.");
  }

  await vincularUso(admin, credito.usoId, pedido.id);

  const pedidoIA = toPromptInput(input);
  const contexto = await montarContextoBase(admin, pedidoIA);
  try {
    const r = await gerarComProvedorConfigurado(pedidoIA, req.signal, contexto.contexto, { tipo: "adaptacao", base });
    const refs = r.roteiro.referencias_base.filter((ref) => contexto.mapa[ref]).map((ref) => ({ ref, ...contexto.mapa[ref] }));
    const { data: roteiro, error } = await admin
      .from("generated_itineraries")
      .insert({
        trip_request_id: pedido.id,
        user_id: user.id,
        title: r.roteiro.titulo,
        itinerary: r.roteiro,
        model: r.modelo,
        input_tokens: r.inputTokens,
        output_tokens: r.outputTokens,
        latency_ms: r.latenciaMs,
        kb_refs: [{ ref: "BASE", tipo: "roteiro", id: base.id }, ...refs],
      })
      .select("id")
      .single();
    if (error) throw error;
    await admin.from("trip_requests").update({ status: "completed" }).eq("id", pedido.id);
    await registrarUso(admin, {
      tipo: "adaptacao",
      userId: user.id,
      tripRequestId: pedido.id,
      itineraryId: roteiro.id,
      produto: "assinado",
      provedor: env.AI_PROVIDER,
      modelo: r.modelo,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      meta: { roteiro_base: base.id },
    });
    return NextResponse.json({ itinerary_id: roteiro.id }, { status: 201 });
  } catch (e) {
    console.error("[assinado]", id, e instanceof GeracaoError ? e.detalhes : e);
    const mensagem = e instanceof GeracaoError ? "Não conseguimos adaptar o roteiro. Tente de novo." : "O serviço de IA falhou. Tente de novo em alguns minutos.";
    await admin.from("trip_requests").update({ status: "failed", error_message: mensagem }).eq("id", pedido.id);
    await devolverCredito(admin, credito.usoId);
    await registrarUso(admin, { tipo: "adaptacao", userId: user.id, tripRequestId: pedido.id, produto: "assinado", sucesso: false, provedor: env.AI_PROVIDER });
    return erro(e instanceof GeracaoError ? 502 : 503, mensagem);
  }
}

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}
