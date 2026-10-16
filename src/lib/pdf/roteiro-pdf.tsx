import "server-only";
import path from "node:path";
import { Circle, Document, Font, Image, Line, Page, renderToBuffer, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { ROTULO_TIPO_PONTO } from "@/lib/itinerary/map";
import { nomeCurto } from "@/lib/itinerary/map";
import { projetarRota, semEmoji } from "@/lib/pdf/layout";
import type { ChecklistState, Itinerary } from "@/lib/validation/itinerary";
import type { TipoPonto } from "@/lib/constants";

// PDF do roteiro: capa com a foto do auge, resumo, desenho da rota e cada parada com checklist e trecho.

const PASTA_FONTES = path.join(process.cwd(), "assets", "fonts");
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(PASTA_FONTES, "Inter-Regular.otf"), fontWeight: 400 },
    { src: path.join(PASTA_FONTES, "Inter-SemiBold.otf"), fontWeight: 600 },
  ],
});
// Sem hifenização automática (nomes de lugar quebrados ao meio ficam estranhos)
Font.registerHyphenationCallback((palavra) => [palavra]);

const COR = {
  tinta: "#13140f",
  tinta2: "#4f5048",
  tinta3: "#8a8a80",
  borda: "#e2dfd6",
  fundo2: "#efede6",
  verde: "#1f6f5c",
  alerta: "#b0751c",
};
const COR_PIN: Record<TipoPonto, string> = {
  hub_entrada: "#2a78d6",
  base_intermediaria: "#8a8a80",
  auge_viagem: "#eb6834",
  hub_saida: "#6250d6",
};

export type ImagemPdf = { data: Buffer; format: "jpg" | "png" };
export type FotoPdf = { imagem: ImagemPdf; autor: string; fonte: string };

export type DadosPdf = {
  roteiro: Itinerary;
  checklist: ChecklistState;
  /** Foto do auge, já baixada */
  capa?: FotoPdf | null;
  /** Miniatura de cada parada, por id_ponto */
  miniaturas?: Record<string, FotoPdf | null>;
  geradoEm?: Date;
  /** Agência (B2B): o PDF sai com a marca dela no lugar da Compass */
  marca?: { nome: string; cor: string; contato: string; logo?: ImagemPdf | null } | null;
};

const s = StyleSheet.create({
  // Sem lineHeight na página: herdado pelo texto dinâmico do rodapé, o react-pdf deixa de desenhar o número da página
  pagina: { fontFamily: "Inter", fontSize: 10, color: COR.tinta, paddingTop: 36, paddingBottom: 52, paddingHorizontal: 40 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  marca: { fontSize: 14, fontWeight: 600, color: COR.verde },
  pequeno: { fontSize: 8.5, color: COR.tinta3 },
  capa: { width: "100%", height: 180, borderRadius: 10, objectFit: "cover" },
  titulo: { fontSize: 24, fontWeight: 600, marginTop: 14, lineHeight: 1.15 },
  numeros: { flexDirection: "row", gap: 16, marginTop: 6, color: COR.tinta2 },
  caixa: { borderWidth: 1, borderColor: COR.borda, borderRadius: 8, padding: 12, marginTop: 14, gap: 6 },
  rotulo: { fontSize: 8.5, fontWeight: 600, color: COR.tinta3, textTransform: "uppercase", letterSpacing: 0.6 },
  secao: { fontSize: 15, fontWeight: 600, marginTop: 22, marginBottom: 8 },
  parada: { borderTopWidth: 1, borderTopColor: COR.borda, paddingTop: 12, marginTop: 12 },
  paradaTopo: { flexDirection: "row", gap: 10, alignItems: "center" },
  numero: { width: 22, height: 22, borderRadius: 11, color: "#ffffff", fontSize: 10, fontWeight: 600, textAlign: "center", paddingTop: 4 },
  mini: { width: 72, height: 50, borderRadius: 6, objectFit: "cover" },
  item: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 4 },
  caixinha: { width: 9, height: 9, borderWidth: 1, borderColor: COR.tinta3, borderRadius: 2, marginTop: 3 },
  categoria: { fontSize: 8, color: COR.tinta3, marginLeft: "auto" },
  trecho: { marginTop: 10, marginLeft: 11, borderLeftWidth: 2, borderLeftColor: COR.borda, borderLeftStyle: "dashed", paddingLeft: 14, paddingVertical: 4 },
  rodape: { position: "absolute", bottom: 24, fontSize: 8, color: COR.tinta3 },
});

const LARGURA_MAPA = 515;
const ALTURA_MAPA = 190;

function DocumentoRoteiro({ roteiro, checklist, capa, miniaturas = {}, geradoEm = new Date(), marca }: DadosPdf) {
  const acento = marca?.cor ?? COR.verde;
  const autor = marca?.nome ?? "Compass";
  const r = roteiro.resumo_estrategico;
  const pontos = roteiro.pontos_mapa;
  const auge = pontos.find((p) => p.tipo_ponto === "auge_viagem") ?? pontos[0];
  const titulo = semEmoji(roteiro.titulo);
  const data = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(geradoEm);
  const projetados = projetarRota(pontos, LARGURA_MAPA, ALTURA_MAPA, 34);
  const creditos = [capa, ...Object.values(miniaturas)].filter((f): f is FotoPdf => !!f).map((f) => `${f.autor} / ${f.fonte}`);

  return (
    <Document title={titulo} author={autor} subject="Roteiro de viagem" creator={autor} language="pt-BR">
      <Page size="A4" style={s.pagina}>
        <View style={s.topo}>
          {marca?.logo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Image src={marca.logo} style={{ height: 30, maxWidth: 140, objectFit: "contain" }} />
              <Text style={[s.marca, { color: acento }]}>{semEmoji(marca.nome)}</Text>
            </View>
          ) : (
            <Text style={[s.marca, { color: acento }]}>{semEmoji(autor)}</Text>
          )}
          <Text style={s.pequeno}>{marca ? `Roteiro preparado em ${data}` : `Roteiro gerado em ${data}`}</Text>
        </View>

        {capa && (
          <View>
            <Image src={capa.imagem} style={s.capa} />
            <Text style={[s.pequeno, { marginTop: 3 }]}>
              {semEmoji(nomeCurto(auge.nome_local))} · Foto: {capa.autor} / {capa.fonte}
            </Text>
          </View>
        )}

        <Text style={s.titulo}>{titulo}</Text>
        <View style={s.numeros}>
          <Text>{r.total_dias_viagem} dias</Text>
          <Text>{pontos.length} paradas</Text>
          <Text>{semEmoji(r.ritmo_aplicado)}</Text>
        </View>

        <View style={s.caixa}>
          <Text style={s.rotulo}>Voos</Text>
          <Text style={{ fontWeight: 600 }}>{semEmoji(r.logistica_voos)}</Text>
          <Text style={[s.rotulo, { marginTop: 4 }]}>Como você se desloca</Text>
          <Text style={{ color: COR.tinta2 }}>{semEmoji(r.estrategia_deslocamento)}</Text>
          <Text style={[s.rotulo, { marginTop: 4 }]}>Por que esta rota é fluida</Text>
          <Text style={{ color: COR.tinta2 }}>{semEmoji(r.justificativa_fluidez)}</Text>
        </View>

        {r.alertas.length > 0 && (
          <View style={[s.caixa, { borderColor: "#e8cf9e", backgroundColor: "#fbf5e9" }]}>
            <Text style={[s.rotulo, { color: COR.alerta }]}>Fique de olho</Text>
            {r.alertas.map((a) => (
              <Text key={a} style={{ color: COR.tinta2 }}>
                • {semEmoji(a)}
              </Text>
            ))}
          </View>
        )}

        <View wrap={false}>
          <Text style={s.secao}>A rota</Text>
          <View style={{ backgroundColor: COR.fundo2, borderRadius: 10 }}>
            <Svg width={LARGURA_MAPA} height={ALTURA_MAPA}>
              {projetados.slice(0, -1).map((a, i) => {
                const b = projetados[i + 1];
                return <Line key={a.ponto.id_ponto} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={acento} strokeWidth={2} />;
              })}
              {projetados.map(({ x, y, ponto }) => (
                <Circle key={ponto.id_ponto} cx={x} cy={y} r={7} fill={COR_PIN[ponto.tipo_ponto]} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Svg>
            {/* Rótulos como texto comum por cima do desenho (o texto do Svg não usa a fonte registrada) */}
            {projetados.map(({ x, y, ponto }) => (
              <Text
                key={ponto.id_ponto}
                style={{
                  position: "absolute",
                  left: Math.min(x + 10, LARGURA_MAPA - 130),
                  top: y - 7,
                  fontSize: 8.5,
                  fontWeight: 600,
                  maxWidth: 125,
                }}
              >
                {ponto.ordem}. {semEmoji(nomeCurto(ponto.nome_local))} · {ponto.dias_alocados}d
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 6 }}>
            {(Object.keys(COR_PIN) as TipoPonto[]).map((t) => (
              <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COR_PIN[t] }} />
                <Text style={s.pequeno}>{ROTULO_TIPO_PONTO[t]}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.secao} minPresenceAhead={120}>
          Parada a parada
        </Text>
        {pontos.map((p, i) => {
          const marcados = new Set(checklist[p.id_ponto] ?? []);
          const mini = miniaturas[p.id_ponto];
          const prox = p.proximo_deslocamento;
          const destino = prox ? pontos.find((q) => q.id_ponto === prox.destino_id) : undefined;
          return (
            <View key={p.id_ponto} style={i === 0 ? { marginTop: 0 } : s.parada}>
              <View style={s.paradaTopo} wrap={false} minPresenceAhead={80}>
                <Text style={[s.numero, { backgroundColor: COR_PIN[p.tipo_ponto] }]}>{p.ordem}</Text>
                {mini && <Image src={mini.imagem} style={s.mini} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: 600 }}>{semEmoji(p.nome_local)}</Text>
                  <Text style={{ color: COR.tinta2 }}>
                    {ROTULO_TIPO_PONTO[p.tipo_ponto]} · {p.dias_alocados} {p.dias_alocados === 1 ? "dia" : "dias"}
                  </Text>
                  <Text style={s.pequeno}>{semEmoji(p.subtitulo_card)}</Text>
                </View>
              </View>

              {p.plano_dias.length > 0 && (
                <View style={{ marginTop: 8, marginLeft: 32, gap: 4 }}>
                  {p.plano_dias.map((d) => (
                    <View key={d.dia} wrap={false} style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={{ width: 38, fontWeight: 600, color: acento }}>Dia {d.dia}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 600 }}>{semEmoji(d.titulo)}</Text>
                        <Text style={{ color: COR.tinta2 }}>{semEmoji(d.descricao)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ marginTop: 6, marginLeft: 32 }}>
                {p.atribuicoes_e_checklist.map((item, k) => (
                  <View key={k} style={s.item} wrap={false}>
                    <View style={[s.caixinha, marcados.has(k) ? { backgroundColor: acento, borderColor: acento } : {}]} />
                    <Text style={{ flex: 1, color: marcados.has(k) ? COR.tinta3 : COR.tinta }}>{semEmoji(item.item)}</Text>
                    <Text style={s.categoria}>{item.categoria}</Text>
                  </View>
                ))}
              </View>

              {prox && (
                <View style={s.trecho} wrap={false}>
                  <Text style={{ fontWeight: 600 }}>
                    Até {destino ? semEmoji(nomeCurto(destino.nome_local)) : "a próxima parada"}: {semEmoji(prox.meio_transporte)}, {prox.tempo_estimado}
                  </Text>
                  <Text style={{ color: COR.tinta2 }}>{semEmoji(prox.instrucoes_logistica)}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ marginTop: 22 }} wrap={false}>
          <Text style={s.pequeno}>
            {marca ? "Roteiro preparado com apoio de IA" : "Roteiro sugerido por IA"}: confira horários, preços e regras de entrada antes de comprar.
            {creditos.length > 0 ? ` Fotos: ${[...new Set(creditos)].join(", ")}.` : ""}
          </Text>
        </View>

        <Text style={[s.rodape, { left: 40 }]} fixed>
          {marca ? `${semEmoji(marca.nome)}${marca.contato ? ` · ${marca.contato}` : ""}` : `Compass · ${titulo}`}
        </Text>
        <Text style={[s.rodape, { left: 40, right: 40, textAlign: "right" }]} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}

export function gerarPdfRoteiro(dados: DadosPdf): Promise<Buffer> {
  return renderToBuffer(<DocumentoRoteiro {...dados} />);
}
