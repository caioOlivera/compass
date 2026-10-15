"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { projetar, ROTA } from "@/components/landing/data";
import { PacePicker } from "@/components/landing/pace-picker";
import { RoutePanel } from "@/components/landing/route-panel";
import { Showcase } from "@/components/landing/showcase";
import { Stages } from "@/components/landing/stages";
import { T } from "@/components/landing/type";

const corpo = T.corpo;
const titulo = T.titulo;
const botao =
  "inline-flex min-h-11 items-center bg-accent px-5 text-[15px] font-medium text-accent-contrast transition-[transform,background-color] hover:bg-[#ffa53a] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text";
const link = "underline decoration-2 underline-offset-4 transition-colors hover:text-accent-strong";

export function Landing() {
  const [ativa, setAtiva] = useState(-1);
  const hero = useRef<HTMLDivElement>(null);
  const paradas = useRef<(HTMLElement | null)[]>([]);

  // A parada no meio da tela é a que o painel fixo mostra; no primeiro ecrã, nenhuma.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.parada);
          setAtiva(i);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    paradas.current.forEach((el) => el && obs.observe(el));
    if (hero.current) obs.observe(hero.current);
    return () => obs.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  const escala = useTransform(scrollYProgress, [0, 1], [1, 0.94]);

  return (
    <div className="bg-bg text-text">
      {/* Rota: painel fixo à esquerda, leitura à direita */}
      <div className="relative lg:grid lg:grid-cols-[47%_1fr]">
        <nav aria-label="Principal" className="relative z-20 flex items-center justify-end gap-6 px-5 py-3 text-[15px] sm:px-8 lg:absolute lg:top-0 lg:right-0 lg:py-0 lg:pt-8">
          <a href="#como-funciona" className="hidden transition-colors hover:text-accent-strong lg:inline">
            Como funciona
          </a>
          <a href="#o-que-voce-recebe" className="hidden transition-colors hover:text-accent-strong lg:inline">
            O que você recebe
          </a>
          <Link href="/exemplo" className="hidden transition-colors hover:text-accent-strong sm:inline">
            Exemplo
          </Link>
          <Link href="/login" className="transition-colors hover:text-accent-strong">
            Entrar
          </Link>
          <Link href="/cadastro" className={botao}>
            Montar roteiro
          </Link>
        </nav>
        <div className="h-[58svh] p-3 lg:sticky lg:top-0 lg:h-svh lg:p-5 lg:pr-0">
          <RoutePanel ativa={ativa} />
        </div>

        <div className="min-w-0">
          <div ref={hero} data-parada={-1} className="relative flex flex-col lg:h-svh">

            <motion.p
              style={{ scale: escala }}
              className={`mt-3 origin-bottom-left px-3 text-[21vw] lg:hidden ${T.marca}`}
              aria-hidden
            >
              compass
            </motion.p>

            <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-[clamp(48px,5vw,72px)] lg:pt-[18vh] lg:pb-0">
              <h1 className="sr-only">Compass</h1>
              <p className={`max-w-[26ch] ${T.destaque}`}>
                Roteiros que entram por uma cidade e saem por outra. A IA monta a rota, o mapa mostra o caminho.
              </p>
            </div>
            <motion.p
              style={{ scale: escala }}
              aria-hidden
              className={`hidden origin-bottom-right px-[clamp(20px,2.5vw,40px)] pb-10 text-right text-[clamp(120px,12.6vw,230px)] lg:block ${T.marca}`}
            >
              compass
            </motion.p>
          </div>

          <Parada
            ref={(el) => {
              paradas.current[0] = el;
            }}
            i={0}
            titulo="Entra por uma porta"
          >
            <p className={corpo}>
              Você sai de São Paulo e pousa onde a viagem começa. Para quem quer as Dolomitas, isso é Roma: três dias
              de cidade antes de o trem seguir para o norte.
            </p>
            <p className={`reveal tabular-nums ${T.titulo}`}>
              GRU → FCO
            </p>
          </Parada>

          <Parada
            ref={(el) => {
              paradas.current[1] = el;
            }}
            i={1}
            titulo="Para no caminho, nunca fora dele"
          >
            <p className={corpo}>
              Sobrou tempo? Entra uma base que já está na rota, como Florença entre Roma e as montanhas. Cada trecho
              vem com o meio de transporte e o tempo de porta a porta.
            </p>
            <dl className={`reveal flex flex-col gap-3 bg-surface p-5 sm:p-6 ${T.pequeno}`}>
              {ROTA.slice(0, -1).map((p, i) => (
                <div key={p.id} className="flex flex-wrap justify-between gap-x-4">
                  <dt>
                    {p.nome} → {ROTA[i + 1].nome}
                  </dt>
                  <dd className="text-text-2 tabular-nums">
                    {p.trecho!.meio}, {p.trecho!.tempo}
                  </dd>
                </div>
              ))}
            </dl>
          </Parada>

          <Parada
            ref={(el) => {
              paradas.current[2] = el;
            }}
            i={2}
            titulo="O auge fica com mais dias"
          >
            <p className={corpo}>
              Diga qual lugar faz a viagem valer a pena. Os dias vão primeiro para ele, e o resto se encaixa em volta
              no ritmo que você escolher. Troque o ritmo e veja os mesmos 15 dias se reorganizarem.
            </p>
            <div className="reveal">
              <PacePicker />
            </div>
          </Parada>

          <Parada
            ref={(el) => {
              paradas.current[3] = el;
            }}
            i={3}
            titulo="Sai por outra"
          >
            <p className={corpo}>
              O carro fica em Malpensa e o voo de volta parte dali, de Milão para São Paulo. Ninguém refaz quase 600 km
              até Roma só para pegar o avião onde chegou.
            </p>
            <p className={`reveal bg-field-warm p-6 sm:p-8 ${T.destaque}`}>
              Uma linha só, do primeiro ao último dia. Nenhum trecho repetido.
            </p>
          </Parada>
        </div>

      </div>

      <Stages />
      <Showcase />

      <section aria-label="Comece agora" className="px-5 pt-[30svh] pb-[20svh] sm:px-8 lg:pl-[calc(47%+clamp(48px,5vw,72px))]">
        <p className={`reveal max-w-[34ch] ${T.destaque}`}>
          Conte para onde quer ir e qual lugar não pode faltar. O caminho, de uma porta à outra, é com a gente.
        </p>
        <div className="reveal mt-6 flex flex-wrap items-center gap-6">
          <Link href="/cadastro" className={botao}>
            Montar meu roteiro
          </Link>
          <Link href="/exemplo" className={`text-[15px] ${link}`}>
            Ver o exemplo
          </Link>
        </div>
      </section>

      <Rodape />
    </div>
  );
}

function Marca({ className }: { className: string }) {
  return (
    <p className={`text-right text-[clamp(120px,12vw,200px)] leading-[0.8] font-normal tracking-[-0.045em] ${className}`}>
      compass
    </p>
  );
}

function Parada({
  ref,
  i,
  titulo: t,
  children,
}: {
  ref: React.Ref<HTMLElement>;
  i: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={ref}
      data-parada={i}
      aria-label={`${ROTA[i].nome}: ${t}`}
      className="flex flex-col justify-center gap-6 px-5 py-20 sm:px-8 lg:min-h-[92svh] lg:px-[clamp(48px,5vw,72px)]"
    >
      <div className="flex max-w-[46ch] flex-col gap-6">
        <h2 className={`reveal ${titulo}`}>{t}</h2>
        {children}
      </div>
    </section>
  );
}

function Rodape() {
  const W = 480;
  const H = 560;
  const pts = ROTA.map((p) => ({ ...p, ...projetar(p.lat, p.lng, W, H) }));
  const itens = [
    ["Como funciona", "#como-funciona"],
    ["O que você recebe", "#o-que-voce-recebe"],
    ["Ver o exemplo", "/exemplo"],
    ["Entrar", "/login"],
    ["Criar conta", "/cadastro"],
  ] as const;
  return (
    <footer className="grid bg-field-warm lg:min-h-svh lg:grid-cols-2">
      <div className="h-[50svh] overflow-hidden bg-text lg:h-auto" aria-hidden>
        <svg viewBox="-20 -20 620 620" preserveAspectRatio="xMidYMid meet" className="h-full w-full p-8">
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#f7941d"
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p) => (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={22} fill="#1f2b4d" stroke="white" strokeWidth={8} />
              <text x={p.x + 36} y={p.y + 12} fontSize={34} fill="white">
                {p.nome}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-col gap-16 px-5 py-14 sm:px-8 lg:px-[clamp(48px,6vw,96px)] lg:py-20">
        <p className={`${T.destaque} font-medium`}>compass</p>
        <nav aria-label="Rodapé" className="group flex flex-col gap-5 lg:gap-7">
          {itens.map(([rotulo, href]) => (
            <Link
              key={href}
              href={href}
              className={`w-fit transition-[transform,color] duration-200 group-hover:text-text-2 hover:translate-x-3 hover:text-text! ${T.titulo}`}
            >
              {rotulo}
            </Link>
          ))}
        </nav>
        <div className={`grid gap-6 sm:grid-cols-2 ${T.pequeno}`}>
          <p>
            Para viajantes: um roteiro por pedido, salvo na sua conta, com checklist que você marca durante a viagem.
          </p>
          <p>Para agências: planos mensais para montar roteiros de clientes estão a caminho.</p>
        </div>
        <p className={`mt-auto text-text-2 ${T.pequeno}`}>
          © 2026 Compass. Roteiros sugeridos por IA: confira horários, preços e regras antes de comprar.
        </p>
      </div>
    </footer>
  );
}
