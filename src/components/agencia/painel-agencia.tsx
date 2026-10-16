"use client";

import { Crown, ImageUp, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { adicionarMembro, criarAgencia, definirLogo, removerMembro, salvarMarca } from "@/app/actions/agencia";
import { BotaoAssinar } from "@/components/compras/botoes";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import type { Marca } from "@/lib/agencia";
import { createClient } from "@/lib/supabase/client";

export function CriarAgencia() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await criarAgencia(nome);
          if (!r.ok) setErro(r.mensagem);
          else router.refresh();
        });
      }}
    >
      <Field label="Nome da agência" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Rota Viagens" required />
      <FormAlert>{erro}</FormAlert>
      <Button type="submit" carregando={ocupado} className="self-start">
        Criar minha agência
      </Button>
    </form>
  );
}

type Props = {
  orgId: string;
  souDono: boolean;
  eu: string;
  marca: Marca;
  logoUrl: string | null;
  membros: { id: string; papel: string; nome: string }[];
  plano: string | null;
  planoAte?: string | null;
  creditosMes?: number | null;
  precos?: { basic: string; premium: string };
};

export function PainelAgencia({ orgId, souDono, eu, marca, logoUrl, membros, plano, planoAte, creditosMes, precos }: Props) {
  const router = useRouter();
  const [dados, setDados] = useState(marca);
  const [msgMarca, setMsgMarca] = useState("");
  const [email, setEmail] = useState("");
  const [msgMembro, setMsgMembro] = useState("");
  const [ocupado, iniciar] = useTransition();
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  async function trocarLogo(f: File | undefined) {
    if (!f) return;
    if (f.size > 1024 * 1024) return setMsgMarca("Logo de até 1 MB (PNG, JPG ou WebP).");
    setEnviandoLogo(true);
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${orgId}/logo-${Date.now()}.${ext}`;
    const up = await createClient().storage.from("marcas").upload(caminho, f, { contentType: f.type });
    const r = up.error ? { ok: false as const, mensagem: "Não foi possível enviar o logo." } : await definirLogo(caminho);
    setMsgMarca(r.ok ? "Logo atualizado." : r.mensagem);
    setEnviandoLogo(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Marca no PDF</h2>
        <p className="text-sm text-text-2">O PDF dos roteiros criados por qualquer pessoa da agência sai com este logo, cor e contato.</p>

        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo do Storage */}
            {logoUrl ? <img src={logoUrl} alt="Logo da agência" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-text-3">Sem logo</span>}
          </div>
          {souDono && (
            <>
              <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => trocarLogo(e.target.files?.[0])} />
              <Button variante="secundario" carregando={enviandoLogo} onClick={() => arquivo.current?.click()}>
                <ImageUp className="size-4" aria-hidden /> {logoUrl ? "Trocar logo" : "Enviar logo"}
              </Button>
            </>
          )}
        </div>

        <fieldset disabled={!souDono} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Nome" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Cor
              <input
                type="color"
                value={dados.cor}
                onChange={(e) => setDados({ ...dados, cor: e.target.value })}
                className="h-11 w-20 cursor-pointer rounded-lg border border-border bg-surface p-1"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-mail de contato" type="email" value={dados.contato.email} onChange={(e) => setDados({ ...dados, contato: { ...dados.contato, email: e.target.value } })} />
            <Field label="Telefone / WhatsApp" value={dados.contato.telefone} onChange={(e) => setDados({ ...dados, contato: { ...dados.contato, telefone: e.target.value } })} />
            <Field label="Site" placeholder="https://" value={dados.contato.site} onChange={(e) => setDados({ ...dados, contato: { ...dados.contato, site: e.target.value } })} />
            <Field label="Instagram" placeholder="@agencia" value={dados.contato.instagram} onChange={(e) => setDados({ ...dados, contato: { ...dados.contato, instagram: e.target.value } })} />
          </div>
          {souDono && (
            <Button
              className="self-start"
              carregando={ocupado}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvarMarca(dados);
                  setMsgMarca(r.mensagem ?? "");
                  router.refresh();
                })
              }
            >
              Salvar marca
            </Button>
          )}
        </fieldset>
        {msgMarca && <p className="text-sm text-text-2">{msgMarca}</p>}
        {!souDono && <p className="text-xs text-text-3">Só o dono da agência edita a marca.</p>}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Equipe</h2>
        <ul className="flex flex-col divide-y divide-border">
          {membros.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                {m.papel === "dono" && <Crown className="size-4 text-accent-strong" aria-label="Dono" />}
                {m.nome}
                {m.id === eu && <span className="text-text-3">(você)</span>}
              </span>
              {souDono && m.papel !== "dono" && (
                <button
                  type="button"
                  onClick={() =>
                    iniciar(async () => {
                      const r = await removerMembro(m.id);
                      setMsgMembro(r.ok ? "Pessoa removida." : r.mensagem);
                    })
                  }
                  className="rounded-md p-1.5 text-text-2 hover:bg-red-500/10 hover:text-red-700"
                  aria-label={`Remover ${m.nome}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
        {souDono && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              iniciar(async () => {
                const r = await adicionarMembro(email);
                setMsgMembro(r.mensagem ?? "");
                if (r.ok) setEmail("");
              });
            }}
          >
            <Field label="Adicionar pessoa pelo e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-64 flex-1" />
            <Button type="submit" variante="secundario" carregando={ocupado}>
              <UserPlus className="size-4" aria-hidden /> Adicionar
            </Button>
          </form>
        )}
        {msgMembro && <p className="text-sm text-text-2">{msgMembro}</p>}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Plano</h2>
        {plano ? (
          <p className="text-text-2">
            Plano {plano === "basic" ? "Basic: 30 consultas completas por mês" : "Premium: consultas sem limite (uso justo)"}
            {planoAte ? `, renovado até ${new Date(planoAte).toLocaleDateString("pt-BR")}` : ""}.
            {creditosMes != null && plano === "basic" ? ` Restam ${creditosMes} consultas neste mês.` : ""}
          </p>
        ) : (
          <p className="text-text-2">Assinatura mensal no cartão, cancele quando quiser. Os créditos do Basic renovam todo mês e não acumulam.</p>
        )}
        {souDono && !plano && (
          <div className="grid gap-3 sm:grid-cols-2">
            <BotaoAssinar plano="basic" rotulo={`Assinar Basic · ${precos?.basic ?? "R$ 199,90"}/mês`} />
            <BotaoAssinar plano="premium" rotulo={`Assinar Premium · ${precos?.premium ?? "R$ 399,90"}/mês`} />
          </div>
        )}
      </section>
    </div>
  );
}
