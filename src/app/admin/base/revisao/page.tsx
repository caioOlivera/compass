import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AprovarFonte } from "@/components/admin/aprovar-fonte";
import { FilaRevisao } from "@/components/admin/fila-revisao";
import { exigirAdmin } from "@/lib/admin";

// Aprovar gera embeddings em lote: pode levar alguns segundos.
export const maxDuration = 120;

const ROTULO_FONTE: Record<string, string> = {
  relato_comunidade: "Relato da comunidade",
  roteiro_proprio: "Roteiro próprio",
  anotacao_propria: "Anotação própria",
  consultoria: "Consultoria",
};

export default async function RevisaoPage({ searchParams }: { searchParams: Promise<{ ingestao?: string }> }) {
  const { supabase } = await exigirAdmin();
  const { ingestao } = await searchParams;

  if (!ingestao) {
    const [{ data: ingestoes }, { data: pendentes }] = await Promise.all([
      supabase
        .from("ingestoes")
        .select("id, created_at, fontes(titulo, tipo, autoria, viagem_mes)")
        .eq("status", "revisao")
        .order("created_at", { ascending: true }),
      supabase.from("ingestao_itens").select("ingestao_id").eq("decisao", "pendente").limit(20000),
    ]);
    const porIngestao = new Map<string, number>();
    for (const p of pendentes ?? []) porIngestao.set(p.ingestao_id, (porIngestao.get(p.ingestao_id) ?? 0) + 1);
    const lista = (ingestoes ?? []).filter((i) => porIngestao.get(i.id));
    // Os seus primeiro: roteiros assinados destravam o produto de R$ 14,90
    lista.sort((a, b) => Number(b.fontes?.autoria === "propria") - Number(a.fontes?.autoria === "propria"));

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Revisão</h1>
          <p className="text-text-2">
            {lista.length ? `${lista.length} ${lista.length === 1 ? "fonte" : "fontes"} com itens para revisar.` : "Nada pendente."}
          </p>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((i) => (
            <li key={i.id} className="flex h-full flex-col gap-1 rounded-xl border border-border bg-surface p-4">
              <span className="text-xs text-text-3">
                {ROTULO_FONTE[i.fontes?.tipo ?? ""] ?? "Fonte"}
                {i.fontes?.viagem_mes ? ` · viagem ${i.fontes.viagem_mes.slice(5)}/${i.fontes.viagem_mes.slice(0, 4)}` : ""}
              </span>
              <Link href={`/admin/base/revisao?ingestao=${i.id}`} className="font-medium hover:text-accent-strong">
                {i.fontes?.titulo}
              </Link>
              <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <Link href={`/admin/base/revisao?ingestao=${i.id}`} className="text-sm text-accent-strong underline-offset-4 hover:underline">
                  Revisar {porIngestao.get(i.id)} itens
                </Link>
                <AprovarFonte ingestaoId={i.id} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!z.uuid().safeParse(ingestao).success) notFound();
  const [{ data: dados }, { data: itens }] = await Promise.all([
    supabase
      .from("ingestoes")
      .select("id, status, modelo, fontes(titulo, tipo, autoria, viagem_mes, texto, arquivo_nome)")
      .eq("id", ingestao)
      .maybeSingle(),
    supabase.from("ingestao_itens").select("id, tipo, dados, avisos, decisao, ordem").eq("ingestao_id", ingestao).order("ordem"),
  ]);
  if (!dados) notFound();
  const fonte = dados.fontes;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/admin/base/revisao" className="text-sm text-text-2 hover:text-text">
          ← Todas as fontes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{fonte?.titulo}</h1>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-2">
          <span>{ROTULO_FONTE[fonte?.tipo ?? ""]}</span>
          <span>{fonte?.autoria === "propria" ? "Conteúdo próprio" : "Conteúdo de terceiro (entra resumido)"}</span>
          {fonte?.viagem_mes && <span>Viagem: {fonte.viagem_mes.slice(5)}/{fonte.viagem_mes.slice(0, 4)}</span>}
          {dados.modelo && <span>Extraído por {dados.modelo}</span>}
        </p>
        {fonte?.texto && (
          <details className="rounded-xl border border-border bg-surface p-3 text-sm">
            <summary className="cursor-pointer text-text-2">Ver o texto original (privado)</summary>
            <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-text-2">{fonte.texto}</pre>
          </details>
        )}
      </header>
      <FilaRevisao itens={itens ?? []} />
    </div>
  );
}
