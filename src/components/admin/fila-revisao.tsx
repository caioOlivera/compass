"use client";

import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { aprovarItens, rejeitarItens, type ResultadoRevisao } from "@/app/actions/base";
import { Button } from "@/components/ui/button";
import {
  schemaDoItem,
  type DestinoExtraido,
  type DicaExtraida,
  type EventoExtraido,
  type LugarExtraido,
  type RoteiroExtraido,
  type TipoItem,
  type TrechoExtraido,
} from "@/lib/conhecimento/extracao";
import { formatarCusto, formatarDuracao, nomePais, rotuloLugar, rotuloMeio } from "@/lib/conhecimento/registros";
import { cn } from "@/lib/utils";

type Item = { id: string; tipo: string; dados: unknown; avisos: string[]; decisao: string; ordem: number };

const TITULO_GRUPO: Record<TipoItem, string> = {
  roteiro: "Roteiro",
  destino: "Destinos",
  lugar: "Lugares",
  trecho: "Trechos",
  dica: "Dicas",
  evento: "Eventos",
};
const ORDEM_GRUPOS: TipoItem[] = ["roteiro", "destino", "lugar", "trecho", "dica", "evento"];

export function FilaRevisao({ itens }: { itens: Item[] }) {
  const router = useRouter();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [errosItem, setErrosItem] = useState<Record<string, string>>({});
  const [ocupado, iniciar] = useTransition();

  const pendentes = useMemo(() => itens.filter((i) => i.decisao === "pendente"), [itens]);
  const semAviso = pendentes.filter((i) => i.avisos.length === 0 || i.avisos.every((a) => a.startsWith("Já existe")));

  const alternar = (id: string) =>
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function relatar(r: ResultadoRevisao) {
    const partes = [];
    if (r.aprovados) partes.push(`${r.aprovados} aprovados`);
    if (r.rejeitados) partes.push(`${r.rejeitados} rejeitados`);
    if (r.indexados) partes.push(`${r.indexados} indexados para busca`);
    if (r.erros.length) partes.push(`${r.erros.length} com erro`);
    setErrosItem(Object.fromEntries(r.erros.map((e) => [e.id, e.mensagem])));
    setMensagem({ tipo: r.erros.length ? "erro" : "ok", texto: partes.join(" · ") || "Nada a fazer." });
    setSelecionados(new Set());
    router.refresh();
  }

  function aprovar(ids: string[]) {
    const edicoesValidas: Record<string, unknown> = {};
    for (const id of ids) {
      if (edicoes[id] === undefined) continue;
      try {
        edicoesValidas[id] = JSON.parse(edicoes[id]);
      } catch {
        setErrosItem((e) => ({ ...e, [id]: "O JSON editado não é válido." }));
        return;
      }
    }
    setMensagem(null);
    iniciar(async () => relatar(await aprovarItens({ ids, edicoes: edicoesValidas })));
  }

  function rejeitar(ids: string[]) {
    setMensagem(null);
    iniciar(async () => relatar(await rejeitarItens(ids)));
  }

  const grupos = ORDEM_GRUPOS.map((t) => ({ tipo: t, itens: itens.filter((i) => i.tipo === t) })).filter((g) => g.itens.length);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-y border-border bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <span className="mr-auto text-sm text-text-2">
          {pendentes.length} pendentes{selecionados.size ? ` · ${selecionados.size} selecionados` : ""}
        </span>
        <Button variante="fantasma" className="h-9" onClick={() => setSelecionados(new Set(pendentes.map((i) => i.id)))} disabled={ocupado}>
          Selecionar todos
        </Button>
        <Button variante="secundario" className="h-9" onClick={() => rejeitar([...selecionados])} disabled={ocupado || !selecionados.size}>
          Rejeitar selecionados
        </Button>
        <Button variante="secundario" className="h-9" onClick={() => aprovar([...selecionados])} disabled={ocupado || !selecionados.size}>
          Aprovar selecionados
        </Button>
        <Button className="h-9" carregando={ocupado} onClick={() => aprovar(semAviso.map((i) => i.id))} disabled={!semAviso.length}>
          Aprovar {semAviso.length} sem aviso
        </Button>
      </div>

      {mensagem && (
        <p role="status" className={cn("rounded-lg px-4 py-2 text-sm", mensagem.tipo === "ok" ? "bg-accent/10 text-accent-strong" : "bg-red-500/10 text-red-700")}>
          {mensagem.texto}
        </p>
      )}

      {grupos.map((g) => (
        <section key={g.tipo} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            {TITULO_GRUPO[g.tipo]} <span className="text-sm font-normal text-text-3">({g.itens.length})</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {g.itens.map((item) => {
              const pendente = item.decisao === "pendente";
              const texto = edicoes[item.id];
              let dadosVisiveis: unknown = item.dados;
              if (texto !== undefined) {
                try {
                  dadosVisiveis = JSON.parse(texto);
                } catch {
                  // mostra os originais enquanto o JSON está inválido
                }
              }
              const valido = schemaDoItem(item.tipo as TipoItem).safeParse(dadosVisiveis);
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border bg-surface p-4",
                    selecionados.has(item.id) ? "border-accent" : "border-border",
                    !pendente && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {pendente && (
                      <input
                        type="checkbox"
                        checked={selecionados.has(item.id)}
                        onChange={() => alternar(item.id)}
                        aria-label="Selecionar"
                        className="mt-1 size-4 accent-[var(--accent)]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <ResumoItem tipo={item.tipo as TipoItem} dados={dadosVisiveis} />
                    </div>
                    {pendente ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditando(editando === item.id ? null : item.id);
                            setEdicoes((e) => (e[item.id] !== undefined ? e : { ...e, [item.id]: JSON.stringify(item.dados, null, 2) }));
                          }}
                          title="Editar"
                          className="rounded-md p-2 text-text-2 hover:bg-surface-2 hover:text-text"
                        >
                          <Pencil className="size-4" aria-hidden />
                          <span className="sr-only">Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => rejeitar([item.id])}
                          disabled={ocupado}
                          title="Rejeitar"
                          className="rounded-md p-2 text-text-2 hover:bg-red-500/10 hover:text-red-700"
                        >
                          <X className="size-4" aria-hidden />
                          <span className="sr-only">Rejeitar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => aprovar([item.id])}
                          disabled={ocupado || !valido.success}
                          title="Aprovar"
                          className="rounded-md p-2 text-accent-strong hover:bg-accent/10 disabled:opacity-40"
                        >
                          <Check className="size-4" aria-hidden />
                          <span className="sr-only">Aprovar</span>
                        </button>
                      </div>
                    ) : (
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs", item.decisao === "aprovado" ? "bg-accent/10 text-accent-strong" : "bg-surface-2 text-text-2")}>
                        {item.decisao}
                      </span>
                    )}
                  </div>
                  {item.avisos.map((a) => (
                    <p key={a} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                      {a}
                    </p>
                  ))}
                  {!valido.success && (
                    <p className="text-xs text-red-600">
                      Dados inválidos: {valido.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} (${i.message})`).join("; ")}
                    </p>
                  )}
                  {errosItem[item.id] && <p className="text-xs text-red-600">{errosItem[item.id]}</p>}
                  {editando === item.id && (
                    <textarea
                      value={texto ?? ""}
                      onChange={(e) => setEdicoes((ed) => ({ ...ed, [item.id]: e.target.value }))}
                      spellCheck={false}
                      rows={Math.min(24, (texto ?? "").split("\n").length + 1)}
                      className="w-full rounded-lg border border-border bg-bg p-3 font-mono text-xs"
                      aria-label="Dados do item (JSON)"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <p className="text-sm text-text-2">
      <span className="text-text-3">{rotulo}: </span>
      {children}
    </p>
  );
}

const COR_VEREDITO = { recomendado: "text-accent-strong", neutro: "text-text-3", evitar: "text-red-600" };

function ResumoItem({ tipo, dados }: { tipo: TipoItem; dados: unknown }) {
  switch (tipo) {
    case "destino": {
      const d = dados as DestinoExtraido;
      return (
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">
            {d.nome} <span className="text-sm font-normal text-text-3">· {d.tipo === "pais" ? "país" : `${d.tipo} em ${nomePais(d.pais_codigo)}`}</span>
          </p>
          <Linha rotulo="Resumo">{d.resumo}</Linha>
          <Linha rotulo="Visto">{d.visto}</Linha>
          <Linha rotulo="Melhores meses">{d.melhor_epoca_meses?.join(", ")}</Linha>
        </div>
      );
    }
    case "lugar": {
      const l = dados as LugarExtraido;
      return (
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">
            {l.nome}{" "}
            <span className="text-sm font-normal text-text-3">
              · {rotuloLugar(l.tipo)} em {l.destino}, {nomePais(l.pais_codigo)}
            </span>{" "}
            <span className={cn("text-xs font-medium", COR_VEREDITO[l.veredito])}>{l.veredito}</span>
          </p>
          <p className="text-sm">{l.resumo}</p>
          <Linha rotulo="Custo">{formatarCusto(l.custo)}</Linha>
          <Linha rotulo="Tempo">{formatarDuracao(l.tempo_visita_min)}</Linha>
          <Linha rotulo="Tags">{l.tags?.join(", ")}</Linha>
          <Linha rotulo="Citação">“{l.citacao}”</Linha>
        </div>
      );
    }
    case "trecho": {
      const t = dados as TrechoExtraido;
      return (
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">
            {t.origem} → {t.destino} <span className="text-sm font-normal text-text-3">· {rotuloMeio(t.meio)}</span>
          </p>
          <Linha rotulo="Duração">{formatarDuracao(t.duracao_min)}</Linha>
          <Linha rotulo="Custo">{formatarCusto(t.custo)}</Linha>
          <Linha rotulo="Operador">{t.operador}</Linha>
          <Linha rotulo="Obs">{t.obs}</Linha>
          <Linha rotulo="Citação">“{t.citacao}”</Linha>
        </div>
      );
    }
    case "dica": {
      const d = dados as DicaExtraida;
      return (
        <div className="flex flex-col gap-0.5">
          <p className="text-sm">
            <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-2">{d.categoria}</span>
            <span className="text-text-3">{d.lugar ? `${d.lugar}, ` : ""}{d.destino}: </span>
            {d.texto}
          </p>
          <Linha rotulo="Citação">“{d.citacao}”</Linha>
        </div>
      );
    }
    case "evento": {
      const e = dados as EventoExtraido;
      return (
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">
            {e.nome} <span className="text-sm font-normal text-text-3">· {e.destino}</span>
          </p>
          <Linha rotulo="Data">{e.regra_data}</Linha>
        </div>
      );
    }
    case "roteiro": {
      const r = dados as RoteiroExtraido;
      return (
        <div className="flex flex-col gap-1.5">
          <p className="font-medium">
            {r.titulo} <span className="text-sm font-normal text-text-3">· {r.duracao_dias} dias</span>
          </p>
          <p className="text-sm text-text-2">{r.resumo}</p>
          <Linha rotulo="Época">{r.epoca}</Linha>
          {!!r.essencia?.length && (
            <ul className="list-disc pl-5 text-sm text-text-2">
              {r.essencia.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <ol className="mt-1 flex flex-col gap-0.5 text-sm">
            {r.dias?.map((d) => (
              <li key={d.dia}>
                <span className="font-medium tabular-nums">Dia {d.dia}</span> · {d.cidade}
                {d.deslocamento ? ` (${rotuloMeio(d.deslocamento.meio)} ${d.deslocamento.de} → ${d.deslocamento.para})` : ""}
                {d.atividades.length ? <span className="text-text-2"> — {d.atividades.join("; ")}</span> : null}
              </li>
            ))}
          </ol>
        </div>
      );
    }
  }
}
