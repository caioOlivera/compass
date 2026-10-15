import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { GeracaoError } from "@/lib/ai/generate";
import { gerarComProvedorConfigurado } from "@/lib/ai";
import { ProvedorError } from "@/lib/ai/providers/openai-compatible";
import { serverEnv } from "@/lib/env";
import { registrarUso } from "@/lib/medicao";
import { montarContextoBase } from "@/lib/motor/contexto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toPromptInput, toTripRequestRow, TripRequestInputSchema } from "@/lib/validation/trip-request";

// A geração leva de 30 s a 2 min; na Vercel o padrão de 60 s não basta.
export const maxDuration = 300;

/**
 * POST /api/generate-itinerary
 * Body: TripRequestInput (respostas do wizard, chaves do PRD).
 * 201 { trip_request_id, itinerary_id } | 400 validação | 401 sem sessão | 429 limite diário | 502/503 falha da IA
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro(401, "Faça login para gerar roteiros.");

  const body = await req.json().catch(() => null);
  const parsed = TripRequestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revise as respostas do questionário.", campos: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;
  if (input.data_inicio < ontemUTC()) {
    return NextResponse.json(
      { error: "A data de saída já passou.", campos: { data_inicio: ["Escolha uma data a partir de hoje"] } },
      { status: 400 },
    );
  }

  const env = serverEnv();
  const admin = createAdminClient();

  const { data: usadas, error: erroLimite } = await admin.rpc("generations_last_24h", { p_user_id: user.id });
  if (erroLimite) return erroInterno("contar gerações", erroLimite);
  if (usadas >= env.DAILY_GENERATION_LIMIT) {
    return erro(429, `Você já gerou ${usadas} roteiros nas últimas 24 horas. Tente de novo mais tarde.`);
  }

  // Inserido com a sessão do usuário: a RLS confere o dono e os grants impedem definir o status.
  const { data: pedido, error: erroPedido } = await supabase
    .from("trip_requests")
    .insert(toTripRequestRow(input))
    .select("id")
    .single();
  if (erroPedido) return erroInterno("salvar pedido", erroPedido);

  const marcarStatus = (status: "generating" | "completed" | "failed", error_message: string | null = null) =>
    admin.from("trip_requests").update({ status, error_message }).eq("id", pedido.id);

  await marcarStatus("generating");

  const pedidoIA = toPromptInput(input);
  // Lugares, trechos e dicas da base que interessam a este pedido (vazio se a base não tiver nada)
  const base = await montarContextoBase(admin, pedidoIA);

  try {
    const resultado = await gerarComProvedorConfigurado(pedidoIA, req.signal, base.contexto);
    const refsUsadas = resultado.roteiro.referencias_base.filter((ref) => base.mapa[ref]).map((ref) => ({ ref, ...base.mapa[ref] }));

    const { data: roteiro, error: erroRoteiro } = await admin
      .from("generated_itineraries")
      .insert({
        trip_request_id: pedido.id,
        user_id: user.id,
        title: resultado.roteiro.titulo,
        itinerary: resultado.roteiro,
        model: resultado.modelo,
        input_tokens: resultado.inputTokens,
        output_tokens: resultado.outputTokens,
        latency_ms: resultado.latenciaMs,
        kb_refs: refsUsadas,
      })
      .select("id")
      .single();
    if (erroRoteiro) throw erroRoteiro;

    await marcarStatus("completed");
    await registrarUso(admin, {
      tipo: "geracao",
      userId: user.id,
      tripRequestId: pedido.id,
      itineraryId: roteiro.id,
      produto: "roteiro",
      provedor: env.AI_PROVIDER,
      modelo: resultado.modelo,
      inputTokens: resultado.inputTokens,
      outputTokens: resultado.outputTokens,
      meta: { tentativas: resultado.tentativas, latencia_ms: resultado.latenciaMs, refs_enviadas: base.contexto.refs.length, refs_usadas: refsUsadas.length },
    });
    return NextResponse.json({ trip_request_id: pedido.id, itinerary_id: roteiro.id }, { status: 201 });
  } catch (e) {
    const { status, mensagem } = classificarFalha(e);
    await marcarStatus("failed", mensagem);
    // Falha também custa (tokens das tentativas): fica registrada sem tokens conhecidos
    await registrarUso(admin, {
      tipo: "geracao",
      userId: user.id,
      tripRequestId: pedido.id,
      produto: "roteiro",
      provedor: env.AI_PROVIDER,
      sucesso: false,
      meta: { erro: mensagem },
    });
    console.error("[generate-itinerary]", pedido.id, e instanceof GeracaoError ? e.detalhes : e);
    return NextResponse.json({ error: mensagem, trip_request_id: pedido.id }, { status });
  }
}

function classificarFalha(e: unknown): { status: number; mensagem: string } {
  if (e instanceof GeracaoError) return { status: 502, mensagem: e.message };
  if (e instanceof Anthropic.APIUserAbortError) return { status: 499, mensagem: "Geração cancelada." };
  // Teto de gasto mensal da conta Anthropic: mesmo tipo de erro do rate limit, mas não volta
  // até o mês virar ou o limite subir. Precisa de ação nossa, não do usuário.
  if (e instanceof Anthropic.RateLimitError && codigoErroAnthropic(e) === "enforced_spend_limit_reached") {
    console.error("[generate-itinerary] ALERTA: teto de gasto mensal da Anthropic atingido");
    return { status: 503, mensagem: "A geração de roteiros está temporariamente indisponível. Já fomos avisados." };
  }
  if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) {
    return { status: 503, mensagem: "O serviço de IA está sobrecarregado. Tente de novo em alguns minutos." };
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return { status: 503, mensagem: "Não conseguimos falar com o serviço de IA. Tente de novo." };
  }
  // Provedores no formato OpenAI (Ollama, Gemini, Groq...)
  if (e instanceof ProvedorError) {
    if (e.status === 429) {
      return { status: 503, mensagem: "Atingimos o limite de uso do serviço de IA. Tente de novo em alguns minutos." };
    }
    if (e.status >= 500) {
      return { status: 503, mensagem: "O serviço de IA está sobrecarregado agora. Tente de novo em alguns minutos." };
    }
    return { status: 502, mensagem: "O serviço de IA recusou o pedido. Confira a configuração do provedor." };
  }
  if (e instanceof DOMException && e.name === "AbortError") return { status: 499, mensagem: "Geração cancelada." };
  // fetch sem resposta: Ollama desligado, endereço errado, sem internet
  if (e instanceof TypeError && e.message === "fetch failed") {
    return { status: 503, mensagem: "Não conseguimos falar com o serviço de IA. Ele está ligado?" };
  }
  return { status: 500, mensagem: "Erro inesperado ao gerar o roteiro." };
}

function codigoErroAnthropic(e: InstanceType<typeof Anthropic.APIError>): string | undefined {
  const corpo = e.error as { error?: { details?: { error_code?: string } } } | undefined;
  return corpo?.error?.details?.error_code;
}

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}

function erroInterno(etapa: string, e: unknown) {
  console.error(`[generate-itinerary] falha ao ${etapa}`, e);
  return erro(500, "Erro inesperado. Tente de novo.");
}

/** Data de ontem em UTC: margem para quem está atrás de UTC no fuso. */
function ontemUTC(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}
