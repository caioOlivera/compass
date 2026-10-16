import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Itinerary } from "@/lib/validation/itinerary";
import type { Database } from "@/types/database";
import { linkBuscaAviasales } from "./aviasales";
import { estadiasDoRoteiro, trechosDoRoteiro, type EstadiaCotada, type Extras, type PedidoBase, type TrechoCotado } from "./completo-plano";
import { cotarHoteis, cotarVoo } from "./cotar";
import { linksDeAfiliado, serpapiConfigurada, serpapiHoteis, travelpayoutsConfigurado, travelpayoutsVoos } from "./provedores";
import { escolherHoteis, linkBooking } from "./serpapi-ler";

type Db = SupabaseClient<Database>;

/**
 * Cota passagens (Travelpayouts) e 2–3 hotéis por cidade (SerpApi Google Hotels) para um roteiro.
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

  const trechos: TrechoCotado[] = await Promise.all(
    trechosDoRoteiro(roteiro, pedido).map(async (t) => {
      const base = { rotulo: t.rotulo, consulta: t.consulta, link_busca: linkBuscaAviasales(t.consulta) };
      if (!travelpayoutsConfigurado()) return { ...base, provedor: null, cotado_em: null, ofertas: [] };
      try {
        const c = await cotarVoo(db, travelpayoutsVoos, t.consulta, usoCot);
        return { ...base, provedor: c.provedor, cotado_em: c.cotado_em, ofertas: c.ofertas.slice(0, 3) };
      } catch (e) {
        console.error("[completo] voo", t.consulta, e);
        return { ...base, provedor: null, cotado_em: null, ofertas: [] };
      }
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

  // Links de afiliado de uma vez (a API aceita 10 por chamada); sem marker, ficam os originais
  const urls = [
    ...trechos.flatMap((t) => [t.link_busca, ...t.ofertas.map((o) => o.link)]),
    ...estadias.flatMap((e) => [e.link_busca, ...e.hoteis.map((h) => h.link)]),
  ];
  const afiliados = await linksDeAfiliado(urls, `roteiro_${uso.itineraryId.slice(0, 8)}`);
  let i = 0;
  for (const t of trechos) {
    t.link_busca = afiliados[i++];
    for (const o of t.ofertas) o.link = afiliados[i++];
  }
  for (const e of estadias) {
    e.link_busca = afiliados[i++];
    for (const h of e.hoteis) h.link = afiliados[i++];
  }

  return { versao: 1, gerado_em: new Date().toISOString(), trechos, estadias };
}
