import { EditorRoteiroBase, type Revisao } from "@/components/admin/editor-roteiro-base";
import { AplicarRevisoes } from "@/components/admin/aplicar-revisoes";
import { exigirAdmin } from "@/lib/admin";
import { lerConfig } from "@/lib/configuracoes";
import { revisoesPendentes } from "@/lib/conhecimento/revisao-roteiro";
import { createAdminClient } from "@/lib/supabase/admin";
import { nomePais } from "@/lib/conhecimento/registros";

export default async function RoteirosBasePage() {
  const { supabase } = await exigirAdmin();
  const { data: roteiros } = await supabase
    .from("roteiros_base")
    .select("id, titulo, auge, assinado, autoria, duracao_dias, resumo, epoca, essencia, paises, roteiro_base_dias(dia, cidade, atividades, deslocamento, obs)")
    .order("assinado", { ascending: false })
    .order("created_at", { ascending: false });
  // Revisões sugeridas (por id do roteiro), aplicadas pelo editor só quando o admin salvar
  // Várias chaves "revisao_assinados*": as mais novas (ordem alfabética) valem por cima
  const admin = createAdminClient();
  const [{ data: cfgRevisoes }, aplicadas] = await Promise.all([
    admin.from("configuracoes").select("chave, valor").like("chave", "revisao_assinados%"),
    lerConfig<Record<string, string[]>>(admin, "revisoes_aplicadas", {}),
  ]);
  const { revisoes, pendentes } = revisoesPendentes(cfgRevisoes ?? [], aplicadas);
  const titulos = new Map((roteiros ?? []).map((r) => [r.id, r.titulo]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Roteiros prontos</h1>
        <p className="text-text-2">Os assinados são vendidos como “Roteiro assinado”; os da comunidade servem de referência para o gerador.</p>
      </header>
      {pendentes.length > 0 && (
        <AplicarRevisoes titulos={pendentes.map((id) => titulos.get(id) ?? id)} />
      )}
      {!roteiros?.length && <p className="text-sm text-text-2">Nenhum roteiro aprovado ainda. Aprove os roteiros na revisão.</p>}
      <ul className="flex flex-col gap-3">
        {roteiros?.map((r) => {
          const dias = [...(r.roteiro_base_dias ?? [])].sort((a, b) => a.dia - b.dia);
          return (
            <li key={r.id}>
              <details className="rounded-xl border border-border bg-surface p-4">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{r.titulo}</span>
                  {r.assinado && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-contrast">Assinado</span>}
                  <span className="text-sm text-text-3">
                    {r.duracao_dias} dias · {r.paises.map(nomePais).join(", ")}
                  </span>
                </summary>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <p className="text-text-2">{r.resumo}</p>
                  {r.epoca && <p><span className="text-text-3">Época: </span>{r.epoca}</p>}
                  {!!r.essencia.length && (
                    <ul className="list-disc pl-5 text-text-2">
                      {r.essencia.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  )}
                  <ol className="flex flex-col gap-0.5">
                    {dias.map((d) => (
                      <li key={d.dia}>
                        <span className="font-medium tabular-nums">Dia {d.dia}</span> · {d.cidade}
                        {d.atividades.length ? <span className="text-text-2"> — {d.atividades.join("; ")}</span> : null}
                      </li>
                    ))}
                  </ol>
                </div>
                <EditorRoteiroBase
                  id={r.id}
                  revisao={pendentes.includes(r.id) ? (revisoes[r.id] as Revisao) : null}
                  inicial={{
                    titulo: r.titulo,
                    auge: r.auge,
                    resumo: r.resumo,
                    epoca: r.epoca,
                    essencia: r.essencia,
                    paises: r.paises,
                    dias: dias.map((d) => ({
                      dia: d.dia,
                      cidade: d.cidade,
                      atividades: d.atividades,
                      deslocamento: (d.deslocamento as { meio: string; de: string; para: string; obs: string | null } | null) ?? null,
                      obs: d.obs,
                    })),
                  }}
                />
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
