import type { Metadata } from "next";
import { DESTINOS_LANDING, MOSAICO_HERO, REGIOES_LANDING } from "@/components/landing/destinos";
import { Assinados } from "@/components/landing/assinados";
import { DestinosCarrossel } from "@/components/landing/destinos-carrossel";
import { Faq } from "@/components/landing/faq";
import { ChamadaFinal, Rodape } from "@/components/landing/fechamento";
import { Hero } from "@/components/landing/hero";
import { Regioes } from "@/components/landing/regioes";
import { RouteStory } from "@/components/landing/route-story";
import { Showcase } from "@/components/landing/showcase";
import { SiteHeader } from "@/components/landing/site-header";
import { Stages } from "@/components/landing/stages";
import { buscarFoto, buscarFotos, type Foto } from "@/lib/images/fotos";
import { catalogoAssinados, formatarPreco, precoAssinado } from "@/lib/motor/catalogo";

export const metadata: Metadata = {
  title: "Compass: roteiros de viagem fluidos",
  description:
    "Roteiros que entram por uma cidade e saem por outra. Responda oito perguntas e receba a rota no mapa, com os dias de cada parada, os trechos e o checklist.",
};

// As fotos vêm do Unsplash/Pexels (cache de uma semana no servidor). Sem chave ou sem rede, os cartões
// mostram a cor e o emoji de cada destino.
export const revalidate = 604800;

export default async function Home() {
  const [assinados, preco] = await Promise.all([catalogoAssinados(), precoAssinado()]);
  const [mosaico, regioes, destinos, chamada, fotosAssinados] = await Promise.all([
    Promise.all(MOSAICO_HERO.map((m, i) => buscarFoto(m.busca, { orientacao: i === 0 ? "portrait" : "landscape" }))),
    buscarFotos(REGIOES_LANDING.map((r) => r.busca), { orientacao: "landscape" }),
    buscarFotos(DESTINOS_LANDING.map((d) => d.busca), { orientacao: "portrait" }),
    buscarFoto("airplane window clouds", { orientacao: "landscape" }),
    buscarFotos(assinados.slice(0, 3).map((a) => a.cidades[Math.min(1, a.cidades.length - 1)] ?? a.titulo), { idioma: "pt-BR" }),
  ]);
  const creditos = [...mosaico, ...regioes, ...destinos, chamada, ...fotosAssinados].filter((f): f is Foto => f !== null);

  return (
    <div className="bg-bg text-text">
      <SiteHeader />
      <main>
        <Hero fotos={mosaico} />
        <Regioes fotos={regioes} />
        <DestinosCarrossel fotos={destinos} />
        <Assinados itens={assinados} fotos={fotosAssinados} preco={formatarPreco(preco)} />
        <RouteStory />
        <Moldura titulo="Oito perguntas, nenhuma sobre o caminho" texto="Arraste pelas etapas e veja a tela de cada uma.">
          <Stages />
        </Moldura>
        <Moldura titulo="O que você recebe" texto="Mapa, paradas, trechos e voos, tudo no mesmo roteiro.">
          <Showcase />
        </Moldura>
        <Faq />
        <ChamadaFinal foto={chamada} />
      </main>
      <Rodape creditos={creditos} />
    </div>
  );
}

function Moldura({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h2>
        <p className="max-w-2xl text-text-2">{texto}</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">{children}</div>
    </section>
  );
}
