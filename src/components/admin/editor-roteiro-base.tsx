"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvarRoteiroBase, type RoteiroEditavel } from "@/app/actions/roteiros-base";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

type Deslocamento = { meio: string; de: string; para: string; obs: string | null } | null;
type Dia = { dia: number; cidade: string; atividades: string[]; deslocamento: Deslocamento; obs: string | null };
export type Revisao = Partial<Omit<RoteiroEditavel, "dias">> & { total_dias?: number; dias?: Record<string, Partial<Omit<Dia, "dia">>> };

type Form = { titulo: string; auge: string; resumo: string; epoca: string; essencia: string; paises: string; dias: Dia[] };

const diaVazio = (dia: number): Dia => ({ dia, cidade: "", atividades: [], deslocamento: null, obs: null });

/** Junta os dias atuais com os da revisão; a revisão pode ter mais dias (ou menos, com total_dias). */
function diasDaRevisao(atuais: Dia[], revisao: Revisao): Dia[] {
  const chaves = Object.keys(revisao.dias ?? {}).map(Number);
  const total = revisao.total_dias ?? Math.max(atuais.length, ...chaves);
  return Array.from({ length: total }, (_, i) => {
    const base = atuais.find((d) => d.dia === i + 1) ?? diaVazio(i + 1);
    return { ...base, ...(revisao.dias?.[String(i + 1)] ?? {}), dia: i + 1 };
  });
}

const linhas = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);
const campo = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm";

/** Edita título, resumo, época, essência, países e cada dia de um roteiro pronto. */
export function EditorRoteiroBase({ id, inicial, revisao }: { id: string; inicial: RoteiroEditavel & { dias: Dia[] }; revisao?: Revisao | null }) {
  const router = useRouter();
  const paraForm = (r: RoteiroEditavel & { dias: Dia[] }): Form => ({
    titulo: r.titulo,
    auge: r.auge ?? "",
    resumo: r.resumo,
    epoca: r.epoca ?? "",
    essencia: r.essencia.join("\n"),
    paises: r.paises.join(", "),
    dias: r.dias,
  });
  const [f, setF] = useState<Form>(paraForm(inicial));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const aplicarRevisao = () => {
    if (!revisao) return;
    setF((x) => ({
      titulo: revisao.titulo ?? x.titulo,
      auge: revisao.auge ?? x.auge,
      resumo: revisao.resumo ?? x.resumo,
      epoca: revisao.epoca ?? x.epoca,
      essencia: revisao.essencia ? revisao.essencia.join("\n") : x.essencia,
      paises: revisao.paises ? revisao.paises.join(", ") : x.paises,
      dias: diasDaRevisao(x.dias, revisao),
    }));
    setMsg({ ok: true, texto: "Sugestão aplicada no formulário. Revise e clique em Salvar." });
  };

  const mudarDia = (i: number, parcial: Partial<Dia>) => setF((x) => ({ ...x, dias: x.dias.map((d, k) => (k === i ? { ...d, ...parcial } : d)) }));

  return (
    <form
      className="mt-4 flex flex-col gap-4 border-t border-border pt-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvarRoteiroBase(id, {
            titulo: f.titulo,
            auge: f.auge || null,
            resumo: f.resumo,
            epoca: f.epoca || null,
            essencia: linhas(f.essencia),
            paises: f.paises.split(/[,\s]+/).filter(Boolean),
            dias: f.dias,
          });
          setMsg({ ok: r.ok, texto: r.mensagem });
          if (r.ok) router.refresh();
        });
      }}
    >
      {revisao && (
        <button type="button" onClick={aplicarRevisao} className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent/10 px-3 py-1.5 font-medium text-accent-strong">
          <Sparkles className="size-4" aria-hidden /> Aplicar revisão sugerida
        </button>
      )}
      <label className="flex flex-col gap-1">
        Título
        <input className={campo} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        Auge da viagem (vazio = cidade com mais dias)
        <input className={campo} value={f.auge} onChange={(e) => setF({ ...f, auge: e.target.value })} placeholder="Ex.: Dolomitas" />
      </label>
      <label className="flex flex-col gap-1">
        Resumo
        <textarea className={campo} rows={4} value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          Época
          <input className={campo} value={f.epoca} onChange={(e) => setF({ ...f, epoca: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          Países (códigos, ex.: TH, KR)
          <input className={campo} value={f.paises} onChange={(e) => setF({ ...f, paises: e.target.value })} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        Essência (uma por linha)
        <textarea className={campo} rows={6} value={f.essencia} onChange={(e) => setF({ ...f, essencia: e.target.value })} />
      </label>

      <details>
        <summary className="cursor-pointer font-medium">Dias ({f.dias.length})</summary>
        <ol className="mt-3 flex flex-col gap-3">
          {f.dias.map((d, i) => (
            <li key={d.dia} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[4rem_1fr]">
              <span className="font-medium tabular-nums">Dia {d.dia}</span>
              <div className="flex flex-col gap-2">
                <input className={campo} value={d.cidade} onChange={(e) => mudarDia(i, { cidade: e.target.value })} aria-label={`Cidade do dia ${d.dia}`} />
                <textarea
                  className={campo}
                  rows={2}
                  placeholder="Atividades, uma por linha"
                  value={d.atividades.join("\n")}
                  onChange={(e) => mudarDia(i, { atividades: e.target.value.split("\n") })}
                  onBlur={(e) => mudarDia(i, { atividades: linhas(e.target.value) })}
                />
                <div className="grid gap-2 sm:grid-cols-4">
                  {(["meio", "de", "para", "obs"] as const).map((k) => (
                    <input
                      key={k}
                      className={campo}
                      placeholder={k === "meio" ? "Deslocamento (voo, trem...)" : k === "obs" ? "Obs. do trecho" : k === "de" ? "De" : "Para"}
                      value={d.deslocamento?.[k] ?? ""}
                      onChange={(e) => {
                        const atual = d.deslocamento ?? { meio: "", de: "", para: "", obs: null };
                        const novo = { ...atual, [k]: e.target.value };
                        mudarDia(i, { deslocamento: novo.meio || novo.de || novo.para || novo.obs ? novo : null });
                      }}
                    />
                  ))}
                </div>
                <input className={campo} placeholder="Observação do dia" value={d.obs ?? ""} onChange={(e) => mudarDia(i, { obs: e.target.value || null })} />
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex gap-2">
          <Button type="button" variante="secundario" className="h-9" onClick={() => setF((x) => ({ ...x, dias: [...x.dias, diaVazio(x.dias.length + 1)] }))}>
            Adicionar dia
          </Button>
          {f.dias.length > 1 && (
            <Button type="button" variante="fantasma" className="h-9" onClick={() => setF((x) => ({ ...x, dias: x.dias.slice(0, -1) }))}>
              Remover o último dia
            </Button>
          )}
        </div>
      </details>

      {msg && <FormAlert tipo={msg.ok ? "info" : "erro"}>{msg.texto}</FormAlert>}
      <Button type="submit" carregando={ocupado} className="self-start">
        Salvar roteiro
      </Button>
    </form>
  );
}
