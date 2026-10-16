import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { gerarComProvedorConfigurado } from "@/lib/ai";
import { GeracaoError } from "@/lib/ai/generate";
import { lerConfig } from "@/lib/configuracoes";
import { serverEnv } from "@/lib/env";
import { cobrancaAtiva, exigirCredito, type ProdutoAvulso } from "@/lib/creditos";
import { registrarUso } from "@/lib/medicao";
import { montarContextoBase } from "@/lib/motor/contexto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ItinerarySchema } from "@/lib/validation/itinerary";
import { fromTripRequestRow, toPromptInput } from "@/lib/validation/trip-request";

export const maxDuration = 300;

const CorpoSchema = z.object({ pedido: z.string().trim().min(5, "Conte o que mudar").max(1000) });

/**
 * POST /api/itineraries/[id]/ajustes  { pedido }
 * Aplica um ajuste em linguagem natural e grava como nova versão do mesmo pedido.
 * Cada consulta inclui `ajustes_inclusos` ajustes (configuração); depois disso, 402.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return erro(404, "Roteiro não encontrado.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro(401, "Entre para ajustar o roteiro.");

  const corpo = CorpoSchema.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return erro(400, corpo.error.issues[0]?.message ?? "Pedido inválido.");

  // RLS: só o dono lê
  const { data: atual } = await supabase
    .from("generated_itineraries")
    .select("id, version, itinerary, trip_request_id, trip_requests(*)")
    .eq("id", id)
    .maybeSingle();
  if (!atual?.trip_requests) return erro(404, "Roteiro não encontrado.");

  const admin = createAdminClient();
  const { data: ultima } = await admin
    .from("generated_itineraries")
    .select("version")
    .eq("trip_request_id", atual.trip_request_id)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (ultima && ultima.version !== atual.version) return erro(409, "Ajuste a versão mais recente do roteiro.");

  // Cada crédito dá direito a `ajustes_inclusos` ajustes; passou disso, o próximo consome um novo
  // crédito do mesmo tipo e libera outro pacote. Sem cobrança ligada, o limite é só o pacote incluído.
  const inclusos = Number(await lerConfig(admin, "ajustes_inclusos", 3));
  const usados = atual.version - 1;
  const { count: extras } = await admin
    .from("creditos")
    .select("id", { count: "exact", head: true })
    .eq("trip_request_id", atual.trip_request_id)
    .eq("motivo", "ajuste_extra");
  const permitidos = inclusos * (1 + (extras ?? 0));
  if (usados >= permitidos) {
    if (!(await cobrancaAtiva(admin))) {
      return erro(402, `Você já usou os ${inclusos} ajustes incluídos nesta consulta.`);
    }
    const produto = (["roteiro", "assinado", "completo"].includes(atual.trip_requests.product) ? atual.trip_requests.product : "roteiro") as ProdutoAvulso;
    const credito = await exigirCredito(admin, { userId: user.id, produto, tripRequestId: atual.trip_request_id, motivo: "ajuste_extra" });
    // Falha na geração não devolve: o pacote de ajustes já foi liberado e continua valendo
    if (!credito.ok) return NextResponse.json({ error: credito.mensagem, comprar: credito.comprar }, { status: credito.status });
  }

  const roteiroAtual = ItinerarySchema.parse(atual.itinerary);
  const pedido = toPromptInput(fromTripRequestRow(atual.trip_requests));
  const base = await montarContextoBase(admin, pedido);
  const env = serverEnv();

  try {
    const r = await gerarComProvedorConfigurado(pedido, req.signal, base.contexto, {
      tipo: "ajuste",
      roteiroAtual,
      pedido: corpo.data.pedido,
    });
    const refs = r.roteiro.referencias_base.filter((ref) => base.mapa[ref]).map((ref) => ({ ref, ...base.mapa[ref] }));
    const { data: nova, error } = await admin
      .from("generated_itineraries")
      .insert({
        trip_request_id: atual.trip_request_id,
        user_id: user.id,
        version: atual.version + 1,
        title: r.roteiro.titulo,
        itinerary: r.roteiro,
        model: r.modelo,
        input_tokens: r.inputTokens,
        output_tokens: r.outputTokens,
        latency_ms: r.latenciaMs,
        kb_refs: refs,
        adjustment_request: corpo.data.pedido,
      })
      .select("id")
      .single();
    if (error) throw error;

    await registrarUso(admin, {
      tipo: "ajuste",
      userId: user.id,
      tripRequestId: atual.trip_request_id,
      itineraryId: nova.id,
      produto: atual.trip_requests.product,
      provedor: env.AI_PROVIDER,
      modelo: r.modelo,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      meta: { versao: atual.version + 1 },
    });
    return NextResponse.json({ itinerary_id: nova.id, ajustes_usados: usados + 1, ajustes_inclusos: inclusos }, { status: 201 });
  } catch (e) {
    console.error("[ajuste]", id, e instanceof GeracaoError ? e.detalhes : e);
    await registrarUso(admin, { tipo: "ajuste", userId: user.id, tripRequestId: atual.trip_request_id, sucesso: false, provedor: env.AI_PROVIDER });
    const mensagem =
      e instanceof GeracaoError ? "Não conseguimos aplicar esse ajuste. Tente descrever de outro jeito." : "O serviço de IA falhou. Tente de novo em alguns minutos.";
    return erro(e instanceof GeracaoError ? 502 : 503, mensagem);
  }
}

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}
