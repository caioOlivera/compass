import { BotaoEmbeddings } from "@/components/admin/botao-embeddings";
import { exigirAdmin } from "@/lib/admin";
import { buscarNaBase } from "@/lib/conhecimento/busca";

export const maxDuration = 120;

const ROTULO_TIPO: Record<string, string> = {
  destino: "Destino",
  lugar: "Lugar",
  trecho: "Trecho",
  dica: "Dica",
  evento: "Evento",
  roteiro: "Roteiro",
};

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string; paises?: string }> }) {
  const { supabase } = await exigirAdmin();
  const { q = "", paises = "" } = await searchParams;
  const codigos = paises
    .toUpperCase()
    .split(/[\s,]+/)
    .filter((c) => /^[A-Z]{2}$/.test(c));

  const [{ count: semEmbedding }, busca] = await Promise.all([
    supabase.from("conhecimento_busca").select("id", { count: "exact", head: true }).is("embedding", null),
    q.trim() ? buscarNaBase(supabase, q.trim(), { paises: codigos, limite: 25 }) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Busca na base</h1>
          <p className="text-text-2">É o que o gerador vê ao montar um roteiro. Teste como um cliente perguntaria.</p>
        </div>
        <BotaoEmbeddings pendentes={semEmbedding ?? 0} />
      </header>

      <form className="flex flex-wrap gap-2" action="/admin/base/busca">
        <input
          name="q"
          defaultValue={q}
          placeholder="Ex.: passeio de barco barato em Krabi"
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3"
          aria-label="O que buscar"
        />
        <input
          name="paises"
          defaultValue={paises}
          placeholder="Países (TH, KR)"
          className="h-11 w-40 rounded-lg border border-border bg-surface px-3"
          aria-label="Filtrar por países (códigos)"
        />
        <button type="submit" className="h-11 rounded-lg bg-accent px-5 text-sm font-medium text-accent-contrast hover:opacity-90">
          Buscar
        </button>
      </form>

      {busca && (
        <section className="flex flex-col gap-2">
          <p className="text-sm text-text-3">
            {busca.resultados.length} resultados · busca {busca.modo === "semantica" ? "por significado (embeddings)" : "por palavras (sem embeddings)"}
          </p>
          <ul className="flex flex-col gap-2">
            {busca.resultados.map((r) => (
              <li key={`${r.registro_tipo}-${r.registro_id}`} className="flex gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-text-3">
                  {ROTULO_TIPO[r.registro_tipo]}
                  <span className="block tabular-nums">{Math.round(r.similaridade * 100)}%</span>
                </span>
                <span>{r.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
