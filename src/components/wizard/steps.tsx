"use client";

import { Building2, Check, Mountain, Plane } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";
import { FLEXIBILIDADE_MAX_DIAS, LOCAIS_MAX, RITMOS, SUBREGIOES } from "@/lib/constants";
import { SUGESTOES_AUGE, SUGESTOES_GERAIS } from "@/lib/sugestoes-auge";
import { diasEntre, type TripRequestDraft } from "@/lib/validation/trip-request";
import type { ErrosEtapa } from "@/lib/wizard";
import { cn } from "@/lib/utils";

export type PropsEtapa = {
  rascunho: TripRequestDraft;
  atualizar: (parcial: Partial<TripRequestDraft>) => void;
  erros: ErrosEtapa;
  hoje: string;
};

// ---------------------------------------------------------------------------
// 1. Região
// ---------------------------------------------------------------------------

const CONTINENTES = [...new Set(SUBREGIOES.map((s) => s.continente))];

export function EtapaRegiao({ rascunho, atualizar, erros }: PropsEtapa) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="sr-only">Sub-região</legend>
      <p className="text-sm text-text-2">O roteiro inteiro fica dentro da sub-região escolhida: entradas, bases e saídas.</p>
      {CONTINENTES.map((continente) => (
        <div key={continente} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-wide text-text-3 uppercase">{continente}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SUBREGIOES.filter((s) => s.continente === continente).map((s) => {
              const ativo = rascunho.continente_regiao === s.id;
              return (
                <label
                  key={s.id}
                  className={cn(
                    "relative flex cursor-pointer items-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium transition",
                    "hover:border-text-3 has-focus-visible:ring-2 has-focus-visible:ring-accent/40",
                    ativo && "border-accent bg-accent/8 text-accent-strong hover:border-accent",
                  )}
                >
                  <input
                    type="radio"
                    name="continente_regiao"
                    value={s.id}
                    checked={ativo}
                    onChange={() => atualizar({ continente_regiao: s.id })}
                    className="sr-only"
                  />
                  {s.nome}
                  {ativo && <Check className="ml-auto size-4" aria-hidden />}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {erros.continente_regiao && <p className="text-sm text-red-600">{erros.continente_regiao}</p>}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// 2. Datas e flexibilidade
// ---------------------------------------------------------------------------

export function EtapaDatas({ rascunho, atualizar, erros, hoje }: PropsEtapa) {
  const dias =
    rascunho.data_inicio && rascunho.data_fim ? diasEntre(rascunho.data_inicio, rascunho.data_fim) : null;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Saída"
          type="date"
          min={hoje}
          value={rascunho.data_inicio}
          onChange={(e) => atualizar({ data_inicio: e.target.value })}
          erro={erros.data_inicio}
        />
        <Field
          label="Retorno"
          type="date"
          min={rascunho.data_inicio || hoje}
          value={rascunho.data_fim}
          onChange={(e) => atualizar({ data_fim: e.target.value })}
          erro={erros.data_fim}
        />
      </div>
      {dias !== null && dias > 0 && (
        <p className="text-sm text-text-2">
          <strong className="text-text">{dias} dias</strong> de viagem
        </p>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <Flexibilidade
          rotulo="Flexibilidade na ida"
          valor={rascunho.flexibilidade_dias_ida ?? 0}
          onChange={(v) => atualizar({ flexibilidade_dias_ida: v })}
        />
        <Flexibilidade
          rotulo="Flexibilidade na volta"
          valor={rascunho.flexibilidade_dias_volta ?? 0}
          onChange={(v) => atualizar({ flexibilidade_dias_volta: v })}
        />
      </div>
      <p className="text-xs text-text-3">A flexibilidade ajuda a encontrar voos melhores em volta das datas.</p>
    </div>
  );
}

function Flexibilidade({ rotulo, valor, onChange }: { rotulo: string; valor: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-sm font-medium">
        {rotulo}
        <span className="text-text-2 tabular-nums">{valor === 0 ? "datas exatas" : `± ${valor} ${valor === 1 ? "dia" : "dias"}`}</span>
      </span>
      <input
        type="range"
        min={0}
        max={FLEXIBILIDADE_MAX_DIAS}
        step={1}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--accent)]"
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// 3. Auge da viagem
// ---------------------------------------------------------------------------

export function EtapaAuge({ rascunho, atualizar, erros }: PropsEtapa) {
  const regiao = SUBREGIOES.find((r) => r.id === rascunho.continente_regiao);
  const sugestoes = regiao ? SUGESTOES_AUGE[regiao.id] : SUGESTOES_GERAIS;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-2">
        O lugar que faz a viagem valer a pena. Pode ser uma cidade ou uma região inteira: a IA escolhe as melhores bases
        dentro dela e reserva mais dias para ela.
      </p>
      <Field
        label="Auge da viagem"
        value={rascunho.auge_da_viagem}
        onChange={(e) => atualizar({ auge_da_viagem: e.target.value })}
        placeholder={`Ex.: ${sugestoes[0].nome}`}
        erro={erros.auge_da_viagem}
        autoFocus
      />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-2">{regiao ? `Ideias para ${regiao.nome}` : "Ideias"}</p>
        <div className="flex flex-wrap gap-2">
          {sugestoes.map((s) => {
            const ativa = rascunho.auge_da_viagem === s.nome;
            return (
              <button
                key={s.nome}
                type="button"
                aria-pressed={ativa}
                onClick={() => atualizar({ auge_da_viagem: s.nome })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition active:scale-[0.97]",
                  ativa
                    ? "border-text bg-text text-white"
                    : "border-border text-text-2 hover:border-text-3 hover:text-text",
                )}
              >
                <span aria-hidden>{s.emoji}</span> {s.nome}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Locais desejados e a evitar
// ---------------------------------------------------------------------------

export function EtapaLocais({ rascunho, atualizar, erros }: PropsEtapa) {
  return (
    <div className="flex flex-col gap-6">
      <TagInput
        label="Quero passar por"
        valores={rascunho.locais_desejados_complementares ?? []}
        onChange={(v) => atualizar({ locais_desejados_complementares: v })}
        placeholder="Ex.: Roma, Milão"
        dica="Opcional. Enter ou vírgula para adicionar. Entram na rota se fizerem sentido no caminho."
        erro={erros.locais_desejados_complementares}
        max={LOCAIS_MAX}
      />
      <TagInput
        label="Não quero conhecer"
        valores={rascunho.locais_a_evitar ?? []}
        onChange={(v) => atualizar({ locais_a_evitar: v })}
        placeholder="Ex.: Veneza"
        dica="Opcional. Esses lugares ficam fora da rota."
        erro={erros.locais_a_evitar}
        max={LOCAIS_MAX}
        tom="negativo"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Origem e aeroportos
// ---------------------------------------------------------------------------

export function EtapaOrigem({ rascunho, atualizar, erros }: PropsEtapa) {
  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Cidade de origem"
        value={rascunho.cidade_origem}
        onChange={(e) => atualizar({ cidade_origem: e.target.value })}
        placeholder="Ex.: São Paulo"
        autoComplete="address-level2"
        erro={erros.cidade_origem}
        autoFocus
      />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4">
        <Checkbox
          checked={rascunho.aceita_outros_aeroportos ?? false}
          onCheckedChange={(v) => atualizar({ aceita_outros_aeroportos: v === true })}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium">Aceito embarcar por aeroportos alternativos</span>
          <span className="text-sm text-text-2">
            Ex.: sair de Campinas (VCP) ou do Rio em vez de Guarulhos, se o voo compensar.
          </span>
        </span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Ritmo
// ---------------------------------------------------------------------------

const DIAS_POR_RITMO: Record<(typeof RITMOS)[number]["id"], { cidade: string; natureza: string }> = {
  lento: { cidade: "4+ dias", natureza: "8 a 10+ dias" },
  medio: { cidade: "3 dias", natureza: "6 a 7 dias" },
  acelerado: { cidade: "2 dias", natureza: "4 a 5 dias" },
};

export function EtapaRitmo({ rascunho, atualizar, erros }: PropsEtapa) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Ritmo de viagem</legend>
      {RITMOS.map((r) => {
        const ativo = rascunho.ritmo_viagem === r.id;
        const dias = DIAS_POR_RITMO[r.id];
        return (
          <label
            key={r.id}
            className={cn(
              "flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-text-3",
              "has-focus-visible:ring-2 has-focus-visible:ring-accent/40",
              ativo && "border-accent bg-accent/8 hover:border-accent",
            )}
          >
            <input
              type="radio"
              name="ritmo_viagem"
              value={r.id}
              checked={ativo}
              onChange={() => atualizar({ ritmo_viagem: r.id })}
              className="sr-only"
            />
            <span className="flex items-center justify-between">
              <span className={cn("font-medium", ativo && "text-accent-strong")}>{r.nome}</span>
              {ativo && <Check className="size-4 text-accent-strong" aria-hidden />}
            </span>
            <span className="text-sm text-text-2">{r.descricao}</span>
            <span className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-2">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5" aria-hidden /> Cidades: {dias.cidade}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mountain className="size-3.5" aria-hidden /> Regiões e natureza: {dias.natureza}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Plane className="size-3.5" aria-hidden /> Conexões: 1 a 2 dias
              </span>
            </span>
          </label>
        );
      })}
      {erros.ritmo_viagem && <p className="text-sm text-red-600">{erros.ritmo_viagem}</p>}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// 7. Observações
// ---------------------------------------------------------------------------

const SUGESTOES = [
  "Quero alugar carro numa cidade e devolver em outra.",
  "Viajo com pessoas idosas, prefiro poucos deslocamentos.",
  "Prefiro trem a carro.",
  "Vamos com crianças pequenas.",
];

export function EtapaObservacoes({ rascunho, atualizar, erros }: PropsEtapa) {
  const texto = rascunho.observacoes ?? "";
  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="observacoes" className="text-sm text-text-2">
        Transporte preferido, quem vai junto, restrições... Opcional, mas muda bastante o roteiro.
      </label>
      <textarea
        id="observacoes"
        value={texto}
        onChange={(e) => atualizar({ observacoes: e.target.value })}
        rows={5}
        maxLength={2000}
        aria-invalid={!!erros.observacoes || undefined}
        className="w-full rounded-lg border border-border bg-surface p-3 text-base outline-none transition placeholder:text-text-3 focus:border-accent focus:ring-2 focus:ring-accent/25 sm:text-sm"
        placeholder="Ex.: Quero fazer as Dolomitas de carro alugado, pegando em uma cidade e devolvendo em outra."
      />
      <div className="flex flex-wrap gap-2">
        {SUGESTOES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => atualizar({ observacoes: texto ? `${texto.trim()} ${s}` : s })}
            className="rounded-full border border-border px-3 py-1 text-left text-sm text-text-2 transition hover:border-text-3 hover:text-text"
          >
            + {s}
          </button>
        ))}
      </div>
      {erros.observacoes && <p className="text-sm text-red-600">{erros.observacoes}</p>}
    </div>
  );
}
