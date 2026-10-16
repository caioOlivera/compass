"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { ORCAMENTOS, RITMOS } from "@/lib/constants";
import { hojeLocal } from "@/lib/wizard";

/** Escolhas do cliente para adaptar um roteiro assinado: datas, origem, quem vai, orçamento, ritmo. */
export function AdaptarAssinado({ id, preco, duracao }: { id: string; preco: string; duracao: number }) {
  const router = useRouter();
  const [hoje, setHoje] = useState("");
  const [dados, setDados] = useState({
    data_inicio: "",
    cidade_origem: "São Paulo",
    adultos: 2,
    criancas: 0,
    orcamento: "medio",
    ritmo_viagem: "medio",
    observacoes: "",
    dias_viagem: duracao,
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [comprar, setComprar] = useState("");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => setHoje(hojeLocal()), []);

  const mudar = (campo: keyof typeof dados, valor: string | number) => setDados((d) => ({ ...d, [campo]: valor }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErros({});
    setMensagem("");
    if (!dados.data_inicio) return setErros({ data_inicio: "Escolha a data de saída" });
    setEnviando(true);
    try {
      const res = await fetch(`/api/roteiros-assinados/${id}/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const corpo = await res.json().catch(() => ({}));
      if (res.ok) return router.push(`/roteiros/${corpo.itinerary_id}`);
      if (res.status === 401) return router.push(`/login?next=${encodeURIComponent(`/roteiros-assinados/${id}`)}`);
      if (corpo.campos) setErros(Object.fromEntries(Object.entries(corpo.campos as Record<string, string[]>).map(([k, v]) => [k, v[0]])));
      setComprar(corpo.comprar ?? "");
      setMensagem(corpo.error ?? "Não foi possível adaptar o roteiro.");
    } catch {
      setMensagem("Sem conexão. Tente de novo.");
    }
    setEnviando(false);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Adaptar para mim</h2>
        <span className="text-lg font-semibold text-accent-strong">{preco}</span>
      </div>
      <Field
        label="Data de saída"
        type="date"
        min={hoje}
        value={dados.data_inicio}
        onChange={(e) => mudar("data_inicio", e.target.value)}
        erro={erros.data_inicio}
        required
      />
      <Field
        label="Quantos dias tem a sua viagem?"
        type="number"
        min={duracao}
        max={duracao + 21}
        value={dados.dias_viagem}
        onChange={(e) => mudar("dias_viagem", Number(e.target.value))}
        dica={`O roteiro tem ${duracao} dias. Dias a mais viram portas de entrada e saída e outras cidades no caminho.`}
      />
      <Field label="Cidade de origem" value={dados.cidade_origem} onChange={(e) => mudar("cidade_origem", e.target.value)} erro={erros.cidade_origem} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Adultos" type="number" min={1} max={20} value={dados.adultos} onChange={(e) => mudar("adultos", Number(e.target.value))} />
        <Field label="Crianças" type="number" min={0} max={20} value={dados.criancas} onChange={(e) => mudar("criancas", Number(e.target.value))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Orçamento
          <select value={dados.orcamento} onChange={(e) => mudar("orcamento", e.target.value)} className="h-11 rounded-lg border border-border bg-surface px-3 font-normal">
            {ORCAMENTOS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Ritmo
          <select value={dados.ritmo_viagem} onChange={(e) => mudar("ritmo_viagem", e.target.value)} className="h-11 rounded-lg border border-border bg-surface px-3 font-normal">
            {RITMOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Algo a considerar? (opcional)
        <textarea
          value={dados.observacoes}
          onChange={(e) => mudar("observacoes", e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex.: lua de mel, quero hotéis com piscina nas ilhas"
          className="rounded-lg border border-border bg-surface p-3 font-normal"
        />
      </label>
      <FormAlert>{mensagem}</FormAlert>
      {comprar && (
        <Link href={comprar} className="inline-flex h-11 items-center justify-center rounded-lg border border-border font-medium hover:bg-surface-2">
          Comprar este roteiro
        </Link>
      )}
      <Button type="submit" disabled={enviando}>
        {enviando ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Adaptando (até 2 minutos)…
          </>
        ) : (
          <>
            <Sparkles className="size-4" aria-hidden /> Adaptar às minhas datas
          </>
        )}
      </Button>
      <p className="text-xs text-text-2">Inclui 3 ajustes depois de pronto. Durante o lançamento, a adaptação está liberada sem cobrança.</p>
    </form>
  );
}
