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
});
