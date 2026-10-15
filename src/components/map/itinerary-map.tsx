"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import type { FilterSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { COR_TRANSPORTE, LegDetalhe } from "@/components/itinerary/leg-info";
import {
  COR_PONTO,
  geojsonDosTrechos,
  limitesDoRoteiro,
  nomeCurto,
  pontoMedio,
  type Selecao,
  type TipoTransporte,
  type Trecho,
} from "@/lib/itinerary/map";
import type { PontoMapa } from "@/lib/validation/itinerary";
import { cn } from "@/lib/utils";

// Worker copiado para public/ no postinstall (scripts/copy-maplibre-worker.mjs).
// Este módulo só carrega no navegador (dynamic com ssr: false), então pode rodar no topo.
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

const ESTILO_PADRAO = "https://tiles.openfreemap.org/styles/positron";
const CAMADA_CLIQUE = "trechos-clique";

const corPorTipo = [
  "match",
  ["get", "tipo"],
  ...Object.entries(COR_TRANSPORTE).flat(),
  COR_TRANSPORTE.outro,
] as unknown as string;

// Voo tracejado, barco pontilhado, terrestre contínuo. dasharray não aceita expressão por feature,
// por isso uma camada para cada estilo.
const CAMADAS: LayerProps[] = [
  {
    id: "trechos-contorno",
    type: "line",
    layout: { "line-cap": "round" },
    paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 },
  },
  {
    id: "trechos-terrestres",
    type: "line",
    filter: ["!", ["in", ["get", "tipo"], ["literal", ["voo", "barco"] satisfies TipoTransporte[]]]],
    layout: { "line-cap": "round" },
    paint: { "line-color": corPorTipo, "line-width": 3.5 },
  },
  {
    id: "trechos-voo",
    type: "line",
    filter: ["==", ["get", "tipo"], "voo"],
    paint: { "line-color": corPorTipo, "line-width": 3, "line-dasharray": [2, 2] },
  },
  {
    id: "trechos-barco",
    type: "line",
    filter: ["==", ["get", "tipo"], "barco"],
    layout: { "line-cap": "round" },
    paint: { "line-color": corPorTipo, "line-width": 3.5, "line-dasharray": [0.1, 2] },
  },
  // Faixa larga e invisível: deixa a linha fácil de clicar, inclusive no dedo
  {
    id: CAMADA_CLIQUE,
    type: "line",
    paint: { "line-color": "#000000", "line-width": 22, "line-opacity": 0 },
  },
];

type Props = {
  pontos: PontoMapa[];
  trechos: Trecho[];
  selecao: Selecao;
  onSelecionar: (s: Selecao) => void;
  /** Espaço ocupado pelo painel aberto, para centralizar o ponto na área visível. */
  deslocamentoPainel: { x: number; y: number };
};

export default function ItineraryMap({ pontos, trechos, selecao, onSelecionar, deslocamentoPainel }: Props) {
  const mapa = useRef<MapRef>(null);
  const [cursor, setCursor] = useState("");
  const dados = useMemo(() => geojsonDosTrechos(trechos), [trechos]);
  const limites = useMemo(() => limitesDoRoteiro(pontos), [pontos]);

  const trechoSelecionado = selecao?.tipo === "trecho" ? trechos.find((t) => t.id === selecao.id) : undefined;
  const pontoSelecionado = selecao?.tipo === "ponto" ? pontos.find((p) => p.id_ponto === selecao.id) : undefined;

  // Ponto escolhido (pelo mapa ou pela lista): só desliza, sem mudar o zoom, para os vizinhos
  // continuarem à vista; centraliza na parte do mapa que o painel não cobre.
  useEffect(() => {
    if (!pontoSelecionado || !mapa.current) return;
    const { lng, lat } = pontoSelecionado.coordenadas;
    mapa.current.easeTo({
      center: [lng, lat],
      offset: [-deslocamentoPainel.x / 2, -deslocamentoPainel.y / 2],
      duration: 700,
    });
  }, [pontoSelecionado, deslocamentoPainel.x, deslocamentoPainel.y]);

  // Trecho escolhido: enquadra as duas pontas para o popup nunca abrir fora da tela.
  useEffect(() => {
    if (!trechoSelecionado || !mapa.current) return;
    mapa.current.fitBounds(limitesDoRoteiro([trechoSelecionado.de, trechoSelecionado.para]), {
      padding: 96,
      maxZoom: 8,
      duration: 700,
    });
  }, [trechoSelecionado]);

  const aoClicar = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id;
    if (typeof id === "string") onSelecionar({ tipo: "trecho", id });
    else if (selecao?.tipo === "trecho") onSelecionar(null);
  };

  const filtroDestaque: FilterSpecification = ["==", ["get", "id"], trechoSelecionado?.id ?? ""];

  return (
    <MapGL
      ref={mapa}
      mapLib={maplibregl}
      initialViewState={{ bounds: limites, fitBoundsOptions: { padding: 72, maxZoom: 8 } }}
      mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE_URL || ESTILO_PADRAO}
      interactiveLayerIds={[CAMADA_CLIQUE]}
      onClick={aoClicar}
      onMouseEnter={() => setCursor("pointer")}
      onMouseLeave={() => setCursor("")}
      cursor={cursor}
      style={{ width: "100%", height: "100%" }}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      <Source id="trechos" type="geojson" data={dados}>
        {CAMADAS.map((c) => (
          <Layer key={c.id} {...c} />
        ))}
        <Layer
          id="trecho-destaque"
          type="line"
          filter={filtroDestaque}
          layout={{ "line-cap": "round" }}
          paint={{ "line-color": "#13140f", "line-width": 2, "line-gap-width": 5, "line-opacity": 0.6 }}
        />
      </Source>

      {pontos.map((p) => {
        const ativo = pontoSelecionado?.id_ponto === p.id_ponto;
        return (
          <Marker
            key={p.id_ponto}
            longitude={p.coordenadas.lng}
            latitude={p.coordenadas.lat}
            anchor="left"
            offset={[-16, 0]}
            style={{ zIndex: ativo ? 2 : 1 }}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelecionar({ tipo: "ponto", id: p.id_ponto });
            }}
          >
            <button
              type="button"
              aria-label={`${p.ordem}. ${p.nome_local}, ${p.dias_alocados} dias`}
              aria-pressed={ativo}
              className="group flex cursor-pointer items-center gap-1.5 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white shadow-md transition-transform",
                  "group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-text",
                  p.tipo_ponto === "auge_viagem" && "size-9 text-base",
                  ativo && "scale-110 ring-2 ring-text",
                )}
                style={{ background: COR_PONTO[p.tipo_ponto] }}
              >
                {p.ordem}
              </span>
              <span className="max-w-40 truncate rounded-md bg-surface/90 px-1.5 py-0.5 text-xs font-medium text-text shadow-sm backdrop-blur-sm">
                {nomeCurto(p.nome_local)}
              </span>
            </button>
          </Marker>
        );
      })}

      {trechoSelecionado && (
        <Popup
          longitude={pontoMedio(trechoSelecionado).lng}
          latitude={pontoMedio(trechoSelecionado).lat}
          onClose={() => onSelecionar(null)}
          closeOnClick={false}
          maxWidth="300px"
          className="compass-popup"
        >
          <LegDetalhe
            deslocamento={trechoSelecionado.deslocamento}
            de={trechoSelecionado.de.nome_local}
            para={trechoSelecionado.para.nome_local}
          />
        </Popup>
      )}
    </MapGL>
  );
}
