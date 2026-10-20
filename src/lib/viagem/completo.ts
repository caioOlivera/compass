import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Itinerary } from "@/lib/validation/itinerary";
import type { Database, Json } from "@/types/database";
import { estadiasDoRoteiro, maisBaratas, trechosDoRoteiro, type EstadiaCotada, type Extras, type PedidoBase, type TrechoCotado } from "./completo-plano";
import { cotarHoteis, cotarVoo } from "./cotar";
import { linksDeAfiliado, serpapiConfigurada, serpapiHoteis, serpapiVoos, travelpayoutsConfigurado, travelpayoutsVoos } from "./provedores";
import { escolherHoteis, linkBooking, linkGoogleFlights } from "./serpapi-ler";
import type { ProvedorVoos } from "./tipos";

type Db = SupabaseClient<Database>;

/**
 * Cota passagens e 2–3 hotéis por cidade (SerpApi Google Hotels) para um roteiro.
 * Passagens: Google Flights (SerpApi) e Aviasales (Travelpayouts) juntos; vale o mais barato para o
 * cliente, venha de onde vier (decisão de produto: preço antes de comissão).
 * Sem chave configurada, cada parte sai só com o link de busca (sem preço). Falha de um provedor
 * não derruba o resto.
 */
export async function montarExtras(
  db: Db,
  roteiro: Itinerary,
  pedido: PedidoBase & { orcamento: string },
  uso: { userId: string; tripRequestId: string; itineraryId: string },
): Promise<Extras> {
  const usoCot = { userId: uso.userId, tripRequestId: uso.tripRequestId };

  const provedoresVoo: ProvedorVoos[] = [
    ...(serpapiConfigurada() ? [serpapiVoos] : []),
    ...(travelpayoutsConfigurado() ? [travelpayoutsVoos] : []),
  ];
  const trechos: TrechoCotado[] = await Promise.all(
    trechosDoRoteiro(roteiro, pedido).map(async (t) => {
      const base = { rotulo: t.rotulo, consulta: t.consulta, link_busca: linkGoogleFlights(t.consulta) };
      const cotacoes = await Promise.all(
        provedoresVoo.map((p) =>
          cotarVoo(db, p, t.consulta, usoCot).catch((e) => {
            console.error("[completo] voo", p.nome, t.consulta, e);
            return null;
          }),
        ),
      );
      const validas = cotacoes.filter((c) => c !== null);
      const ofertas = maisBaratas(validas.flatMap((c) => c.ofertas));
      if (!ofertas.length) return { ...base, provedor: validas[0]?.provedor ?? null, cotado_em: validas[0]?.cotado_em ?? null, ofertas: [] };
      const daMelhor = validas.find((c) => c.provedor === ofertas[0].provedor)!;
      return { ...base, provedor: daMelhor.provedor, cotado_em: daMelhor.cotado_em, ofertas };
    }),
  );

  const estadias: EstadiaCotada[] = await Promise.all(
    estadiasDoRoteiro(roteiro, pedido).map(async (e) => {
      const base = {
        id_ponto: e.id_ponto,
        cidade: e.consulta.cidade,
        checkin: e.consulta.checkin,
        checkout: e.consulta.checkout,
        noites: e.noites,
        link_busca: linkBooking(e.consulta.cidade, e.consulta),
      };
      if (!serpapiConfigurada()) return { ...base, provedor: null, cotado_em: null, hoteis: [] };
      try {
        const c = await cotarHoteis(db, serpapiHoteis, e.consulta, usoCot);
        return { ...base, provedor: c.provedor, cotado_em: c.cotado_em, hoteis: escolherHoteis(c.ofertas, pedido.orcamento) };
      } catch (err) {
        console.error("[completo] hotel", e.consulta, err);
        return { ...base, provedor: null, cotado_em: null, hoteis: [] };
      }
    }),
  );

  // Links de afiliado de uma vez (a API aceita 10 por chamada). Só Aviasales e Booking viram afiliado;
  // Google Flights não tem programa e segue como está. Sem marker, ficam os originais.
  const alvos: { url: string; trocar: (u: string) => void }[] = [];
  const talvez = (url: string, trocar: (u: string) => void) => /aviasales\.|booking\.com/.test(url) && alvos.push({ url, trocar });
  for (const t of trechos) {
    talvez(t.link_busca, (u) => (t.link_busca = u));
    for (const o of t.ofertas) talvez(o.link, (u) => (o.link = u));
  }
  for (const e of estadias) {
    talvez(e.link_busca, (u) => (e.link_busca = u));
    for (const h of e.hoteis) talvez(h.link, (u) => (h.link = u));
  }
  const afiliados = await linksDeAfiliado(alvos.map((a) => a.url), `roteiro_${uso.itineraryId.slice(0, 8)}`);
  alvos.forEach((a, i) => a.trocar(afiliados[i]));

  return { versao: 1, gerado_em: new Date().toISOString(), trechos, estadias };
}

/**
 * Cota e grava passagens e hotéis de uma versão do roteiro. Falha não derruba a entrega: o roteiro
 * sai sem os extras e a tela oferece tentar de novo (sem cobrar outra vez).
 */
export async function completarRoteiro(
  db: Db,
  p: {
    itineraryId: string;
    roteiro: Itinerary;
    input: { cidade_origem: string; data_inicio: string; data_fim: string; adultos?: number; criancas?: number; orcamento?: string };
    userId: string;
    tripRequestId: string;
  },
): Promise<boolean> {
  try {
    const extras = await montarExtras(
      db,
      p.roteiro,
      {
        cidade_origem: p.input.cidade_origem,
        data_inicio: p.input.data_inicio,
        data_fim: p.input.data_fim,
        adultos: p.input.adultos ?? 2,
        criancas: p.input.criancas ?? 0,
        orcamento: p.input.orcamento ?? "medio",
      },
      { userId: p.userId, tripRequestId: p.tripRequestId, itineraryId: p.itineraryId },
    );
    await db.from("generated_itineraries").update({ extras: extras as unknown as Json }).eq("id", p.itineraryId);
    return true;
  } catch (e) {
    console.error("[completo]", p.itineraryId, e);
    return false;
  }
}
