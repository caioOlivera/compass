import { describe, expect, it, vi } from "vitest";
import { roteiroPRD } from "@/lib/itinerary/exemplo";

vi.mock("server-only", () => ({}));

describe("gerarPdfRoteiro", () => {
  it("gera um PDF com fontes embutidas, mesmo sem fotos", async () => {
    const { gerarPdfRoteiro } = await import("@/lib/pdf/roteiro-pdf");
    const pdf = await gerarPdfRoteiro({ roteiro: roteiroPRD(), checklist: { p1: [0] } });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(5_000);
    expect(pdf.toString("latin1")).toContain("Inter");
  }, 20_000);
});
