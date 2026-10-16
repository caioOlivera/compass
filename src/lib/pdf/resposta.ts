import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ContatoSchema, linhaContato, urlDoLogo } from "@/lib/agencia";
import { baixarImagem, fotosParaPdf } from "@/lib/pdf/fotos-pdf";
import { nomeArquivoPdf } from "@/lib/pdf/layout";
import { gerarPdfRoteiro, type DadosPdf } from "@/lib/pdf/roteiro-pdf";
import type { Database } from "@/types/database";
import type { ChecklistState, Itinerary } from "@/lib/validation/itinerary";

/** Monta o PDF (com fotos quando der) e devolve como download. */
export async function respostaPdf(
  roteiro: Itinerary,
  checklist: ChecklistState,
  cache: "privado" | "publico",
  marca: DadosPdf["marca"] = null,
  extras: DadosPdf["extras"] = null,
) {
  const { capa, miniaturas } = await fotosParaPdf(roteiro);
  const pdf = await gerarPdfRoteiro({ roteiro, checklist, capa, miniaturas, marca, extras });
  const nome = nomeArquivoPdf(roteiro.titulo);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": cache === "privado" ? "private, no-store" : "public, max-age=3600",
    },
  });
}

/** Marca da agência de quem está logado (B2B), com o logo já baixado. Sem agência: null. */
export async function marcaDaAgencia(db: SupabaseClient<Database>): Promise<DadosPdf["marca"]> {
  const { data: orgId } = await db.rpc("minha_organizacao");
  if (!orgId) return null;
  const { data: org } = await db.from("organizacoes").select("nome, cor, contato, logo_path").eq("id", orgId).maybeSingle();
  if (!org) return null;
  const url = urlDoLogo(org.logo_path);
  return {
    nome: org.nome,
    cor: org.cor,
    contato: linhaContato(ContatoSchema.catch({ email: "", telefone: "", site: "", instagram: "" }).parse(org.contato)),
    logo: url ? await baixarImagem(url) : null,
  };
}
