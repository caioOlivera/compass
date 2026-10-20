import { describe, expect, it } from "vitest";
import { roteiroPRD } from "@/lib/itinerary/exemplo";
import { iataDaOrigem, iatasDoTexto } from "@/lib/viagem/aeroportos";
import { lerLinksParceiro, lerPrecos, linkBuscaAviasales, parametrosPrecos } from "@/lib/viagem/aviasales";
import { aeroportosDoRoteiro, estadiasDoRoteiro, maisBaratas, totalPassagens, trechosDoRoteiro } from "@/lib/viagem/completo-plano";
import { desviosDePreco, medianaDesvio, resumirEstudo, ROTAS_ESTUDO, variantesTravelpayouts } from "@/lib/viagem/estudo-rotas";
import { escolherHoteis, lerHoteis, lerVoos, linkBooking, linkGoogleFlights } from "@/lib/viagem/serpapi-ler";
import type { OfertaHotel, OfertaVoo } from "@/lib/viagem/tipos";

describe("aeroportos", () => {
  it("reconhece a cidade de origem com ou sem acento e com UF", () => {
    expect(iataDaOrigem("São Paulo")).toBe("SAO");
    expect(iataDaOrigem("goiania - GO")).toBe("GYN");
    expect(iataDaOrigem("Brasília, DF")).toBe("BSB");
    expect(iataDaOrigem("Confins (CNF)")).toBe("CNF");
    expect(iataDaOrigem("Xique-Xique")).toBeNull();
  });
  it("lê os códigos da logística", () => {
    expect(iatasDoTexto("Entrada por Roma (FCO) | Saída por Milão (MXP)")).toEqual(["FCO", "MXP"]);
  });
});

describe("Travelpayouts", () => {
  const c = { origem: "GRU", destino: "LIS", ida: "2027-01-15", volta: "2027-01-30", adultos: 2, criancas: 1 };
  it("monta o link de busca do Aviasales", () => {
    expect(linkBuscaAviasales(c)).toBe("https://www.aviasales.com/search/GRU1501LIS300121");
    expect(linkBuscaAviasales({ origem: "GRU", destino: "LIS", ida: "2027-01-15", adultos: 1 })).toBe("https://www.aviasales.com/search/GRU1501LIS1");
  });
  it("pede sempre mercado brasileiro e reais", () => {
    const p = parametrosPrecos({ ...c, volta: null });
    expect(p.get("market")).toBe("br");
    expect(p.get("currency")).toBe("brl");
    expect(p.get("one_way")).toBe("true");
    expect(p.has("return_at")).toBe(false);
  });
  it("lê a resposta, ordena pelo preço e completa o link", () => {
    const r = lerPrecos(
      {
        success: true,
        data: [
          { price: 5200, airline: "TP", flight_number: 88, transfers: 0, duration_to: 600, link: "/search/GRU1501LIS30011?t=x" },
          { price: 4100.4, airline: "IB", transfers: 1 },
          { price: 0 },
        ],
      },
      c,
    );
    expect(r.map((o) => o.preco_brl)).toEqual([4100, 5200]);
    expect(r[1].link).toBe("https://www.aviasales.com/search/GRU1501LIS30011?t=x");
    expect(r[0].link).toBe(linkBuscaAviasales(c));
    expect(r[1].voo).toBe("TP88");
    expect(lerPrecos({ success: false, error: "x" }, c)).toEqual([]);
  });
  it("lê os links de afiliado, mantendo a posição", () => {
    expect(lerLinksParceiro({ result: { links: [{ partner_url: "https://tp.st/a", code: "success" }, { code: "error" }] } }, 3)).toEqual(["https://tp.st/a", null, null]);
  });
});

describe("SerpApi", () => {
  it("voos: preço por pessoa", () => {
    const r = lerVoos({ best_flights: [{ price: 9000, layovers: [{}], flights: [{ airline: "LATAM" }] }], search_metadata: { google_flights_url: "https://g" } }, 2);
    expect(r[0]).toMatchObject({ preco_brl: 4500, escalas: 1, companhia: "LATAM", link: "https://g" });
  });
  it("hotéis: prefere a diária do Booking", () => {
    const c = { cidade: "Lisboa", checkin: "2027-01-16", checkout: "2027-01-19", adultos: 2 };
    const [h] = lerHoteis(
      { properties: [{ name: "Hotel A", rate_per_night: { extracted_lowest: 500 }, prices: [{ source: "Booking.com", rate_per_night: { extracted_lowest: 520 } }], overall_rating: 4.5 }] },
      c,
      (t) => linkBooking(t, c),
    );
    expect(h).toMatchObject({ diaria_brl: 520, fonte_preco: "Booking.com" });
    expect(h.link).toContain("ss=Hotel+A%2C+Lisboa");
    expect(h.link).toContain("checkin=2027-01-16");
  });
  it("escolhe 3 hotéis bem avaliados na faixa do orçamento", () => {
    const h = (nome: string, diaria: number, estrelas: number, nota: number): OfertaHotel => ({
      provedor: "x",
      nome,
      diaria_brl: diaria,
      total_brl: null,
      nota,
      avaliacoes: 100,
      estrelas,
      lat: null,
      lng: null,
      foto: null,
      fonte_preco: null,
      link: "",
    });
    const lista = [h("luxo", 3000, 5, 4.9), h("a", 300, 3, 4.2), h("b", 450, 3, 4.6), h("c", 600, 4, 4.8), h("ruim", 200, 3, 3.1), h("d", 520, 4, 4.1)];
    const escolhidos = escolherHoteis(lista, "medio");
    expect(escolhidos).toHaveLength(3);
    expect(escolhidos.map((x) => x.nome)).not.toContain("luxo");
    expect(escolhidos.map((x) => x.nome)).not.toContain("ruim");
    expect(escolhidos.map((x) => x.nome)).toContain("c"); // o mais bem avaliado da faixa
    expect(escolhidos[0].diaria_brl).toBeLessThanOrEqual(escolhidos[2].diaria_brl!);
  });
});

describe("plano do completo", () => {
  const r = roteiroPRD();
  const pedido = { cidade_origem: "Goiânia", data_inicio: "2027-05-01", data_fim: "2027-05-15", adultos: 2, criancas: 0 };

  it("open-jaw vira dois trechos só de ida", () => {
    expect(aeroportosDoRoteiro(r, pedido.cidade_origem)).toEqual({ origem: "SAO", entrada: "FCO", saida: "MXP" });
    const t = trechosDoRoteiro(r, pedido);
    expect(t.map((x) => [x.rotulo, x.consulta.origem, x.consulta.destino, x.consulta.ida, x.consulta.volta])).toEqual([
      ["Ida", "SAO", "FCO", "2027-05-01", undefined],
      ["Volta", "MXP", "SAO", "2027-05-15", undefined],
    ]);
  });
  it("sem o campo aeroportos, usa o texto e a cidade de origem", () => {
    const antigo = { ...r, resumo_estrategico: { ...r.resumo_estrategico, aeroportos: null } };
    expect(aeroportosDoRoteiro(antigo, "Goiânia")).toEqual({ origem: "GYN", entrada: "FCO", saida: "MXP" });
  });
  it("mesmo aeroporto na entrada e na saída vira ida e volta", () => {
    const fechado = { ...r, resumo_estrategico: { ...r.resumo_estrategico, aeroportos: { origem: "BSB", entrada: "LIS", saida: "LIS" } } };
    expect(trechosDoRoteiro(fechado, pedido)).toEqual([
      { rotulo: "Ida e volta", consulta: { origem: "BSB", destino: "LIS", ida: "2027-05-01", volta: "2027-05-15", adultos: 2, criancas: 0 } },
    ]);
  });
  it("estadias seguidas, a última com uma noite a menos", () => {
    const e = estadiasDoRoteiro(r, pedido);
    const pontos = [...r.pontos_mapa].sort((a, b) => a.ordem - b.ordem);
    expect(e[0].consulta.checkin).toBe("2027-05-01");
    expect(e[0].noites).toBe(pontos[0].dias_alocados);
    for (let i = 1; i < e.length; i++) expect(e[i].consulta.checkin).toBe(e[i - 1].consulta.checkout);
    expect(e.at(-1)!.noites).toBe(pontos.at(-1)!.dias_alocados - 1);
  });
  it("limita as cidades cotadas às que têm mais noites", () => {
    expect(estadiasDoRoteiro(r, pedido, 2)).toHaveLength(2);
  });
  it("soma das passagens só quando todos os trechos têm preço", () => {
    const o = (p: number) => ({ preco_brl: p }) as never;
    const t = (ofertas: never[]) => ({ rotulo: "", consulta: {} as never, provedor: "x", cotado_em: "", ofertas, link_busca: "" });
    expect(totalPassagens([t([o(3000)]), t([o(2500)])])).toBe(5500);
    expect(totalPassagens([t([o(3000)]), t([])])).toBeNull();
  });
});

describe("estudo das rotas", () => {
  it("tem 20 rotas e variante por código de cidade quando existe", () => {
    expect(ROTAS_ESTUDO).toHaveLength(20);
    expect(variantesTravelpayouts(ROTAS_ESTUDO[9]).map((v) => v.consulta.origem)).toEqual(["GRU", "GRU", "SAO"]);
    expect(variantesTravelpayouts(ROTAS_ESTUDO[1])).toHaveLength(2); // GYN → SSA
  });
  it("resume acerto e desvio", () => {
    const l = (provedor: string, rota: number, preco: number | null) => ({ provedor, rota, variante: "data exata", encontrou: preco != null, preco_brl: preco, latencia_ms: 100, erro: null });
    const linhas = [l("travelpayouts", 1, 900), l("travelpayouts", 2, null), l("serpapi", 1, 1000), l("serpapi", 2, 800)];
    expect(resumirEstudo(linhas).find((r) => r.provedor === "travelpayouts")).toMatchObject({ consultas: 2, acertos: 1, latenciaMediana: 100 });
    const d = desviosDePreco(linhas);
    expect(d).toEqual([{ rota: 1, desvio: -0.1 }]);
    expect(medianaDesvio(d)).toBe(-0.1);
  });
});

describe("passagens: o mais barato entre os provedores", () => {
  const voo = (provedor: string, preco_brl: number, v: string | null = null): OfertaVoo => ({
    provedor,
    preco_brl,
    companhia: "TP",
    voo: v,
    partida: "2027-05-10T08:00",
    chegada_volta: null,
    escalas: 0,
    duracao_min: 700,
    link: provedor === "serpapi" ? "https://www.google.com/travel/flights" : "https://www.aviasales.com/x",
  });

  it("ordena por preço misturando Google Flights e Aviasales", () => {
    const r = maisBaratas([voo("travelpayouts", 4200), voo("serpapi", 3900), voo("serpapi", 5100), voo("travelpayouts", 4000)]);
    expect(r.map((o) => [o.provedor, o.preco_brl])).toEqual([
      ["serpapi", 3900],
      ["travelpayouts", 4000],
      ["travelpayouts", 4200],
    ]);
  });

  it("não repete o mesmo voo vindo dos dois provedores", () => {
    const r = maisBaratas([voo("serpapi", 3900, "TP82"), voo("travelpayouts", 3950, "TP82"), voo("travelpayouts", 4100, "LA8084")]);
    expect(r.map((o) => o.voo)).toEqual(["TP82", "LA8084"]);
  });

  it("link de busca do Google Flights traz rota, datas e passageiros", () => {
    const u = new URL(linkGoogleFlights({ origem: "GRU", destino: "LIS", ida: "2027-05-10", volta: "2027-05-25", adultos: 2, criancas: 1 }));
    expect(u.hostname).toBe("www.google.com");
    expect(u.searchParams.get("q")).toBe("Voos de GRU para LIS em 2027-05-10 volta 2027-05-25 3 passageiros");
    expect(u.searchParams.get("curr")).toBe("BRL");
  });
});
