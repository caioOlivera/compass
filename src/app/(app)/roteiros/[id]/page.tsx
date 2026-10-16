import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ItineraryView } from "@/components/itinerary/itinerary-view";
import { buscarFoto } from "@/lib/images/fotos";
import { fotosDoRoteiro } from "@/lib/itinerary/fotos";
import { lerConfig } from "@/lib/configuracoes";
import { cobrancaAtiva } from "@/lib/creditos";
import { formatarPreco } from "@/lib/motor/catalogo";
import { lerExtras } from "@/lib/viagem/completo-plano";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ChecklistStateSchema, ItinerarySchema } from "@/lib/validation/itinerary";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Seu roteiro — Compass" };

export default async function RoteiroPage({ params }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/roteiros/${id}`);

  const { data } = await supabase
    .from("generated_itineraries")
    .select("itinerary, checklist_state, kb_refs, version, trip_request_id, extras, trip_requests(product)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  // O JSON foi validado antes de ser gravado; se o schema mudou depois, falha aqui e não na tela.
  const roteiro = ItinerarySchema.parse(data.itinerary);
  const checklist = ChecklistStateSchema.catch({}).parse(data.checklist_state);

  const admin = createAdminClient();
  const [fotos, { data: versoes }, inclusos, { count: ajustesExtras }, cobranca] = await Promise.all([
    fotosDoRoteiro(roteiro, (q) => buscarFoto(q, { idioma: "pt-BR" })),
    supabase.from("generated_itineraries").select("id, version").eq("trip_request_id", data.trip_request_id).order("version"),
    lerConfig(admin, "ajustes_inclusos", 3),
    admin.from("creditos").select("id", { count: "exact", head: true }).eq("trip_request_id", data.trip_request_id).eq("motivo", "ajuste_extra"),
    cobrancaAtiva(admin),
  ]);
  const ultimaVersao = versoes?.at(-1)?.version ?? data.version;
  const extras = lerExtras(data.extras);
  let custoCompleto = "Grátis por enquanto.";
  if (cobranca) {
    const { count: usouCompleto } = await admin
      .from("creditos")
      .select("id", { count: "exact", head: true })
      .eq("trip_request_id", data.trip_request_id)
      .eq("tipo", "completo")
      .lt("quantidade", 0);
    const precos = await lerConfig<Record<string, number>>(admin, "precos_produtos", {});
    custoCompleto =
      data.trip_requests?.product === "completo" || (usouCompleto ?? 0) > 0
        ? "Incluído na sua consulta."
        : `Consome 1 crédito Completo (${formatarPreco(precos.completo ?? 49.9)}).`;
  }

  return (
    <ItineraryView
      roteiro={roteiro}
      fotos={fotos}
      checklistInicial={checklist}
      itineraryId={id}
      voltar={{ href: "/roteiros", rotulo: "Meus roteiros" }}
      pdfHref={`/api/itineraries/${id}/pdf`}
      refsBase={Array.isArray(data.kb_refs) ? data.kb_refs.length : 0}
      ajustes={{
        usados: ultimaVersao - 1,
        inclusos: Number(inclusos) * (1 + (ajustesExtras ?? 0)),
        pacoteExtra: cobranca ? Number(inclusos) : 0,
        versoes: (versoes ?? []).map((v) => ({ id: v.id, versao: v.version })),
        versaoAtual: data.version,
      }}
      completo={{ itineraryId: id, extras, custo: custoCompleto }}
    />
  );
}
