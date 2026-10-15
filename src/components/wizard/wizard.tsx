"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { Gerando } from "@/components/wizard/generating";
import {
  EtapaAuge,
  EtapaDatas,
  EtapaLocais,
  EtapaObservacoes,
  EtapaOrigem,
  EtapaRegiao,
  EtapaRitmo,
  EtapaViajantes,
  type PropsEtapa,
} from "@/components/wizard/steps";
import { TripRequestInputSchema, type TripRequestDraft } from "@/lib/validation/trip-request";
import {
  ETAPAS,
  etapaDoCampo,
  hojeLocal,
  migrarRascunho,
  RASCUNHO_VAZIO,
  validarEtapa,
  type ErrosEtapa,
  type InicioQuestionario,
} from "@/lib/wizard";

const COMPONENTES: ((p: PropsEtapa) => React.ReactNode)[] = [
  EtapaRegiao,
  EtapaDatas,
  EtapaAuge,
  EtapaLocais,
  EtapaViajantes,
  EtapaOrigem,
  EtapaRitmo,
  EtapaObservacoes,
];

// Rascunho no navegador: recarregar a página não apaga as respostas. Conveniência só local.
const CHAVE_RASCUNHO = "compass:rascunho-viagem";

function lerRascunho(): { rascunho: TripRequestDraft; etapa: number } | null {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function salvarRascunho(valor: { rascunho: TripRequestDraft; etapa: number } | null) {
  try {
    if (valor) localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(valor));
    else localStorage.removeItem(CHAVE_RASCUNHO);
  } catch {
    // modo privado ou armazenamento bloqueado: segue sem rascunho
  }
}

type Envio = { estado: "parado" } | { estado: "gerando" } | { estado: "erro"; mensagem: string };

export function Wizard({ inicio = {} }: { inicio?: InicioQuestionario }) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState<TripRequestDraft>(RASCUNHO_VAZIO);
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState(1);
  const [erros, setErros] = useState<ErrosEtapa>({});
  const [envio, setEnvio] = useState<Envio>({ estado: "parado" });
  const [hoje, setHoje] = useState("");
  // Só salva depois de restaurar: senão o primeiro render grava o rascunho vazio por cima do salvo
  const [restaurado, setRestaurado] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Data local e rascunho só existem no navegador
  useEffect(() => {
    setHoje(hojeLocal());
    const salvo = lerRascunho();
    if (salvo) {
      // Rascunhos antigos (região única, Europa dividida em três) viram o formato atual
      setRascunho({ ...RASCUNHO_VAZIO, ...migrarRascunho(salvo.rascunho as Record<string, unknown>) });
      setEtapa(Math.min(Math.max(salvo.etapa, 0), ETAPAS.length - 1));
    }
    // Vindo de um cartão da landing: a escolha feita lá vale por cima do rascunho
    if (inicio.regiao || inicio.auge) {
      setRascunho((r) => ({
        ...r,
        ...(inicio.regiao ? { regioes: [inicio.regiao!] } : {}),
        ...(inicio.auge ? { auge_da_viagem: inicio.auge } : {}),
      }));
      setEtapa(inicio.regiao ? 1 : 0);
    }
    setRestaurado(true);
  }, []);

  useEffect(() => {
    if (restaurado) salvarRascunho({ rascunho, etapa });
  }, [rascunho, etapa, restaurado]);

  const atualizar = (parcial: Partial<TripRequestDraft>) => {
    setRascunho((r) => ({ ...r, ...parcial }));
    // Apaga o erro do campo assim que a pessoa mexe nele
    setErros((e) => {
      const copia = { ...e };
      for (const k of Object.keys(parcial)) delete copia[k as keyof ErrosEtapa];
      return copia;
    });
  };

  const irPara = (i: number) => {
    setDirecao(i > etapa ? 1 : -1);
    setEtapa(i);
    setErros({});
    requestAnimationFrame(() => titulo.current?.focus());
  };

  async function avancar(e: React.FormEvent) {
    e.preventDefault();
    const errosEtapa = validarEtapa(rascunho, etapa, hoje);
    setErros(errosEtapa);
    if (Object.keys(errosEtapa).length) return;
    if (etapa < ETAPAS.length - 1) return irPara(etapa + 1);
    await gerar();
  }

  async function gerar() {
    const r = TripRequestInputSchema.safeParse(rascunho);
    if (!r.success) {
      const campos = r.error.issues.map((i) => String(i.path[0]));
      irPara(etapaDoCampo(campos));
      return;
    }
    setEnvio({ estado: "gerando" });
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r.data),
      });
      const corpo = await res.json().catch(() => ({}));
      if (res.ok) {
        salvarRascunho(null);
        router.push(`/roteiros/${corpo.itinerary_id}`);
        return;
      }
      if (res.status === 401) {
        router.push("/login?next=/nova-viagem");
        return;
      }
      if (res.status === 400 && corpo.campos) {
        const campos = Object.keys(corpo.campos);
        const destino = etapaDoCampo(campos);
        setEnvio({ estado: "parado" });
        irPara(destino);
        setErros(Object.fromEntries(campos.map((c) => [c, corpo.campos[c][0]])));
        return;
      }
      setEnvio({ estado: "erro", mensagem: corpo.error ?? "Não foi possível gerar o roteiro. Tente de novo." });
    } catch {
      setEnvio({ estado: "erro", mensagem: "Sem conexão. Verifique sua internet e tente de novo." });
    }
  }

  if (envio.estado === "gerando") return <Gerando auge={rascunho.auge_da_viagem} />;

  const Atual = COMPONENTES[etapa];
  const ultima = etapa === ETAPAS.length - 1;

  return (
    <MotionConfig reducedMotion="user">
      <form onSubmit={avancar} noValidate className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-text-2">
            <span>
              Etapa {etapa + 1} de {ETAPAS.length}
            </span>
            {etapa > 0 && (
              <button type="button" onClick={() => irPara(etapa - 1)} className="inline-flex items-center gap-1 hover:text-text">
                <ArrowLeft className="size-4" aria-hidden /> Voltar
              </button>
            )}
          </div>
          <div className="flex gap-1" aria-hidden>
            {ETAPAS.map((e, i) => (
              <span key={e.id} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                <motion.span
                  className="block h-full bg-accent"
                  initial={false}
                  animate={{ width: i <= etapa ? "100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </span>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direcao}>
          <motion.section
            key={etapa}
            custom={direcao}
            initial={{ opacity: 0, x: 24 * direcao }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * direcao }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            <h1 ref={titulo} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
              {ETAPAS[etapa].titulo}
            </h1>
            <Atual rascunho={rascunho} atualizar={atualizar} erros={erros} hoje={hoje} />
          </motion.section>
        </AnimatePresence>

        {envio.estado === "erro" && <FormAlert>{envio.mensagem}</FormAlert>}

        <div className="flex justify-end">
          <Button type="submit" className="min-w-40">
            {ultima ? (
              <>
                <Sparkles className="size-4" aria-hidden /> {envio.estado === "erro" ? "Tentar de novo" : "Gerar meu roteiro"}
              </>
            ) : (
              <>
                Continuar <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>
    </MotionConfig>
  );
}
