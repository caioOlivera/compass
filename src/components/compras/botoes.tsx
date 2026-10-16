"use client";

import { useState, useTransition } from "react";
import { assinarPlano, atualizarConsultoria, enviarBriefing, iniciarCompra, reembolsarPedido, type Briefing } from "@/app/actions/compras";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import type { Plano, ProdutoAvulso } from "@/lib/creditos";

/** Cria o pedido e leva para o Checkout do Mercado Pago (Pix ou cartão). */
export function BotaoComprar({
  produto,
  roteiroBaseId,
  rotulo = "Comprar",
  variante = "primario",
}: {
  produto: ProdutoAvulso;
  roteiroBaseId?: string;
  rotulo?: string;
  variante?: "primario" | "secundario";
}) {
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variante={variante}
        carregando={ocupado}
        onClick={() =>
          iniciar(async () => {
            setErro("");
            const r = await iniciarCompra(produto, roteiroBaseId ? { roteiro_base_id: roteiroBaseId } : {});
            if (r.ok && r.url) window.location.href = r.url;
            else setErro(r.ok ? "Não foi possível abrir o pagamento." : r.mensagem);
          })
        }
      >
        {rotulo}
      </Button>
      <FormAlert>{erro}</FormAlert>
    </div>
  );
}

export function BotaoAssinar({ plano, rotulo }: { plano: Plano; rotulo: string }) {
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variante="secundario"
        carregando={ocupado}
        onClick={() =>
          iniciar(async () => {
            setErro("");
            const r = await assinarPlano(plano);
            if (r.ok && r.url) window.location.href = r.url;
            else setErro(r.ok ? "Não foi possível abrir a assinatura." : r.mensagem);
          })
        }
      >
        {rotulo}
      </Button>
      <FormAlert>{erro}</FormAlert>
    </div>
  );
}

export function FormBriefing({ consultoriaId }: { consultoriaId: string }) {
  const [dados, setDados] = useState<Required<Briefing>>({ destino: "", datas: "", pessoas: "", orcamento: "", contato: "", detalhes: "" });
  const [msg, setMsg] = useState<{ tipo: "erro" | "info"; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const campo = (k: keyof Briefing) => ({ value: dados[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDados((d) => ({ ...d, [k]: e.target.value })) });
  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await enviarBriefing(consultoriaId, dados);
          setMsg(r.ok ? { tipo: "info", texto: r.mensagem ?? "Enviado." } : { tipo: "erro", texto: r.mensagem });
        });
      }}
    >
      <Field label="Para onde você quer ir?" placeholder="Ex.: norte da Itália e Suíça, ou ainda não sei" required {...campo("destino")} />
      <Field label="Quando e por quantos dias?" placeholder="Ex.: maio de 2027, uns 15 dias" {...campo("datas")} />
      <Field label="Quem vai?" placeholder="Ex.: casal, duas crianças de 6 e 9 anos" {...campo("pessoas")} />
      <Field label="Orçamento aproximado" placeholder="Ex.: R$ 30 mil sem as passagens" {...campo("orcamento")} />
      <Field label="WhatsApp ou e-mail para contato" required {...campo("contato")} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        O que mais o consultor precisa saber?
        <textarea
          value={dados.detalhes}
          onChange={(e) => setDados((d) => ({ ...d, detalhes: e.target.value }))}
          rows={5}
          maxLength={4000}
          placeholder="Estilo de viagem, o que vocês amam, o que não querem de jeito nenhum, viagens que já fizeram"
          className="rounded-lg border border-border bg-bg p-3 font-normal"
        />
      </label>
      {msg && <FormAlert tipo={msg.tipo}>{msg.texto}</FormAlert>}
      <Button type="submit" carregando={ocupado} disabled={msg?.tipo === "info"} className="self-start">
        Enviar briefing
      </Button>
    </form>
  );
}

export function BotaoReembolso({ pedidoId }: { pedidoId: string }) {
  const [msg, setMsg] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={ocupado}
        className="text-sm text-red-700 hover:underline disabled:opacity-60"
        onClick={() => {
          if (!confirm("Reembolsar este pedido no Mercado Pago? O crédito sai do saldo do cliente.")) return;
          iniciar(async () => {
            const r = await reembolsarPedido(pedidoId);
            setMsg(r.ok ? (r.mensagem ?? "Feito.") : r.mensagem);
          });
        }}
      >
        {ocupado ? "Reembolsando…" : "Reembolsar"}
      </button>
      {msg && <span className="text-xs text-text-2">{msg}</span>}
    </span>
  );
}

export function EditorConsultoria({ id, status, notas }: { id: string; status: string; notas: string }) {
  const [s, setS] = useState(status === "aguardando_briefing" ? "nova" : status);
  const [n, setN] = useState(notas);
  const [msg, setMsg] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await atualizarConsultoria(id, { status: s as "nova" | "em_andamento" | "entregue", notas: n });
          setMsg(r.ok ? (r.mensagem ?? "Salvo.") : r.mensagem);
        });
      }}
    >
      <select value={s} onChange={(e) => setS(e.target.value)} className="h-10 rounded-lg border border-border bg-bg px-3 text-sm">
        <option value="nova">Nova</option>
        <option value="em_andamento">Em andamento</option>
        <option value="entregue">Entregue</option>
      </select>
      <textarea value={n} onChange={(e) => setN(e.target.value)} rows={3} placeholder="Notas internas" className="rounded-lg border border-border bg-bg p-2 text-sm" />
      <div className="flex items-center gap-3">
        <Button type="submit" variante="secundario" carregando={ocupado} className="h-9">
          Salvar
        </Button>
        {msg && <span className="text-xs text-text-2">{msg}</span>}
      </div>
    </form>
  );
}
