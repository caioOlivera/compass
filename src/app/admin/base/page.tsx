import Link from "next/link";
import { EnviarArquivos } from "@/components/admin/enviar-arquivos";
import { exigirAdmin } from "@/lib/admin";

// A extração pela IA roda na ação do servidor desta página: até 5 minutos por arquivo.
export const maxDuration = 300;

const dataHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const ROTULO_STATUS: Record<string, string> = {
  processando: "Processando",
  revisao: "Em revisão",
  concluida: "Concluída",
  erro: "Erro",
};

export default async function BasePage() {
  const { supabase } = await exigirAdmin();
  const contar = (tabela: "destinos" | "lugares" | "trechos" | "dicas" | "eventos" | "roteiros_base" | "fontes") =>
    supabase.from(tabela).select("id", { count: "exact", head: true });

  const [destinos, lugares, trechos, dicas, eventos, roteiros, fontes, pendentes, ingestoes] = await Promise.all([
    contar("destinos"),
    contar("lugares"),
    contar("trechos"),
    contar("dicas"),
    contar("eventos"),
    contar("roteiros_base"),
    contar("fontes"),
    supabase.from("ingestao_itens").select("id", { count: "exact", head: true }).eq("decisao", "pendente"),
    supabase
      .from("ingestoes")
      .select("id, status, erro, modelo, input_tokens, output_tokens, created_at, fontes(titulo, tipo, autoria)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const numeros = [
    { rotulo: "Destinos", valor: destinos.count },
    { rotulo: "Lugares", valor: lugares.count },
    { rotulo: "Trechos", valor: trechos.count },
    { rotulo: "Dicas", valor: dicas.count },
    { rotulo: "Eventos", valor: eventos.count },
    { rotulo: "Roteiros", valor: roteiros.count },
    { rotulo: "Fontes", valor: fontes.count },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Base de conhecimento</h1>
          <p className="text-text-2">O que o gerador consulta para montar os roteiros. Só entra o que você aprovar.</p>
        </div>
        {!!pendentes.count && (
          <Link
            href="/admin/base/revisao"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast hover:opacity-90"
          >
            Revisar {pendentes.count} {pendentes.count === 1 ? "item pendente" : "itens pendentes"}
          </Link>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {numeros.map((n) => (
          <div key={n.rotulo} className="rounded-xl border border-border bg-surface p-4">
            <dt className="text-sm text-text-2">{n.rotulo}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{n.valor ?? 0}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Enviar arquivos</h2>
        <EnviarArquivos />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Últimas ingestões</h2>
        {!ingestoes.data?.length ? (
          <p className="text-sm text-text-2">Nenhum arquivo processado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-2">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Fonte</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Tokens (entrada / saída)</th>
                  <th className="px-4 py-2.5 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody>
                {ingestoes.data.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/base/revisao?ingestao=${i.id}`} className="font-medium hover:text-accent-strong">
                        {i.fontes?.titulo ?? "—"}
                      </Link>
                      <span className="ml-2 text-xs text-text-3">{i.fontes?.autoria === "propria" ? "próprio" : "terceiro"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {ROTULO_STATUS[i.status] ?? i.status}
                      {i.erro && <span className="block text-xs text-red-600">{i.erro}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-text-2 tabular-nums">
                      {i.input_tokens ?? 0} / {i.output_tokens ?? 0}
                      {i.modelo && <span className="block text-xs text-text-3">{i.modelo}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-text-2">{dataHora.format(new Date(i.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
