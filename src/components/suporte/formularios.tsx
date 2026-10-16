"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { abrirChamado, encerrarChamado, responderComoCliente, responderComoEquipe } from "@/app/actions/suporte";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { CATEGORIAS_CHAMADO } from "@/lib/contato";

const area = "w-full rounded-lg border border-border bg-bg p-3 text-sm";

export function NovoChamado() {
  const router = useRouter();
  const [assunto, setAssunto] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS_CHAMADO)[number]["id"]>("roteiro");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await abrirChamado({ assunto, categoria, texto });
          if (!r.ok) return setErro(r.mensagem);
          router.push(`/ajuda/${r.id}`);
        });
      }}
    >
      <h2 className="text-lg font-semibold">Abrir um chamado</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Field label="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: roteiro sem a cidade que pedi" required />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Sobre
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as typeof categoria)} className="h-11 rounded-lg border border-border bg-surface px-3 font-normal">
            {CATEGORIAS_CHAMADO.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Mensagem
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={5000} className={area} placeholder="Conte o que aconteceu. Se for sobre um roteiro ou pedido, cole o link." />
      </label>
      <FormAlert>{erro}</FormAlert>
      <Button type="submit" carregando={ocupado} className="self-start">
        Enviar
      </Button>
    </form>
  );
}

export function ResponderChamado({ id, equipe = false, aberto }: { id: string; equipe?: boolean; aberto: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const enviar = (fechar = false) =>
    iniciar(async () => {
      const r = equipe ? await responderComoEquipe(id, texto, fechar) : await responderComoCliente(id, texto);
      setMsg({ ok: r.ok, texto: r.ok ? (r.mensagem ?? "Mensagem enviada.") : r.mensagem });
      if (r.ok) {
        setTexto("");
        router.refresh();
      }
    });
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={5000} className={area} placeholder={equipe ? "Resposta para o cliente" : "Escreva uma mensagem"} aria-label="Mensagem" />
      {msg && <FormAlert tipo={msg.ok ? "info" : "erro"}>{msg.texto}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" carregando={ocupado} disabled={!texto.trim()} className="h-10">
          {equipe ? "Responder" : "Enviar"}
        </Button>
        {equipe && (
          <Button type="button" variante="secundario" disabled={ocupado || !texto.trim()} onClick={() => enviar(true)} className="h-10">
            Responder e encerrar
          </Button>
        )}
        {!equipe && aberto && (
          <Button
            type="button"
            variante="fantasma"
            disabled={ocupado}
            className="h-10"
            onClick={() =>
              iniciar(async () => {
                await encerrarChamado(id);
                router.refresh();
              })
            }
          >
            Resolvido, pode encerrar
          </Button>
        )}
      </div>
    </form>
  );
}
