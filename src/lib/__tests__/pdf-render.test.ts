import { describe, expect, it, vi } from "vitest";
import { roteiroPRD } from "@/lib/itinerary/exemplo";

vi.mock("server-only", () => ({}));

describe("urlRecortada", () => {
  it("pede recorte em JPEG aos CDNs e deixa outras URLs como estão", async () => {
    const { urlRecortada } = await import("@/lib/pdf/fotos-pdf");
    const u = new URL(urlRecortada("https://images.unsplash.com/photo-1?ixid=a&auto=format&w=900", 240, 168));
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ ixid: "a", fm: "jpg", w: "240", h: "168", fit: "crop" });
    expect(u.searchParams.has("auto")).toBe(false);
    const p = new URL(urlRecortada("https://images.pexels.com/photos/1/a.jpeg?w=940", 240, 168));
    expect(p.searchParams.get("w")).toBe("240");
    expect(urlRecortada("https://exemplo.com/a.jpg", 10, 10)).toBe("https://exemplo.com/a.jpg");
  });
});

describe("gerarPdfRoteiro", () => {
  it("gera um PDF com fontes embutidas, mesmo sem fotos", async () => {
    const { gerarPdfRoteiro } = await import("@/lib/pdf/roteiro-pdf");
    const pdf = await gerarPdfRoteiro({ roteiro: roteiroPRD(), checklist: { p1: [0] } });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(5_000);
    expect(pdf.toString("latin1")).toContain("Inter");
  }, 20_000);

  it("com a marca de uma agência, o nome dela aparece no lugar da Compass", async () => {
    const { gerarPdfRoteiro } = await import("@/lib/pdf/roteiro-pdf");
    const pdf = await gerarPdfRoteiro({
      roteiro: roteiroPRD(),
      checklist: {},
      marca: { nome: "Rota Viagens", cor: "#aa3311", contato: "contato@rota.com", logo: null },
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // Título do documento vai nos metadados (texto do PDF é comprimido)
    expect(pdf.toString("latin1")).toMatch(/Rota Viagens/);
  }, 20_000);

  it("com passagens e hotéis, inclui os links de compra", async () => {
    const { gerarPdfRoteiro } = await import("@/lib/pdf/roteiro-pdf");
    const pdf = await gerarPdfRoteiro({
      roteiro: roteiroPRD(),
      checklist: {},
      extras: {
        versao: 1,
        gerado_em: "2026-10-16T12:00:00Z",
        trechos: [
          {
            rotulo: "Ida",
            consulta: { origem: "SAO", destino: "FCO", ida: "2027-05-01", adultos: 2 },
            provedor: "travelpayouts",
            cotado_em: "2026-10-16T12:00:00Z",
            ofertas: [{ provedor: "travelpayouts", preco_brl: 3200, companhia: "TP", voo: null, partida: null, chegada_volta: null, escalas: 1, duracao_min: null, link: "https://www.aviasales.com/search/SAO0105FCO2" }],
            link_busca: "https://www.aviasales.com/search/SAO0105FCO2",
          },
        ],
        estadias: [
          {
            id_ponto: "p1",
            cidade: "Roma",
            checkin: "2027-05-01",
            checkout: "2027-05-04",
            noites: 3,
            provedor: "serpapi",
            cotado_em: "2026-10-16T12:00:00Z",
            hoteis: [{ provedor: "serpapi", nome: "Hotel Exemplo", diaria_brl: 650, total_brl: null, nota: 4.6, avaliacoes: 900, estrelas: 4, lat: null, lng: null, foto: null, fonte_preco: "Booking.com", link: "https://www.booking.com/searchresults.pt-br.html?ss=Hotel+Exemplo" }],
            link_busca: "https://www.booking.com/searchresults.pt-br.html?ss=Roma",
          },
        ],
      },
    });
    const texto = pdf.toString("latin1");
    expect(texto).toContain("aviasales.com/search/SAO0105FCO2");
    expect(texto).toContain("booking.com/searchresults");
  }, 20_000);
});
