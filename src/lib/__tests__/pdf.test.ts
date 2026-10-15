import { describe, expect, it } from "vitest";
import { roteiroPRD } from "@/lib/itinerary/exemplo";
import { nomeArquivoPdf, projetarRota, semEmoji } from "@/lib/pdf/layout";

describe("PDF do roteiro", () => {
  it("semEmoji tira emojis, bandeiras e sobras de espaço", () => {
    expect(semEmoji("🏔️ Dolomitas  🇮🇹")).toBe("Dolomitas");
    expect(semEmoji("Roma → Milão")).toBe("Roma → Milão");
    expect(semEmoji("Café 👩‍👩‍👧 da manhã")).toBe("Café da manhã");
  });

  it("nomeArquivoPdf vira um slug seguro", () => {
    expect(nomeArquivoPdf("Itália de Roma às Dolomitas")).toBe("italia-de-roma-as-dolomitas.pdf");
    expect(nomeArquivoPdf("🏝️")).toBe("roteiro.pdf");
    expect(nomeArquivoPdf('a"b/c\\d')).toBe("a-b-c-d.pdf");
  });

  it("projetarRota cabe na caixa e preserva o norte em cima", () => {
    const pontos = roteiroPRD().pontos_mapa;
    const proj = projetarRota(pontos, 500, 200, 20);
    for (const p of proj) {
      expect(p.x).toBeGreaterThanOrEqual(20 - 1e-6);
      expect(p.x).toBeLessThanOrEqual(480 + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(20 - 1e-6);
      expect(p.y).toBeLessThanOrEqual(180 + 1e-6);
    }
    const roma = proj.find((p) => p.ponto.nome_local.startsWith("Roma"))!;
    const milao = proj.find((p) => p.ponto.nome_local.startsWith("Milão"))!;
    expect(milao.y).toBeLessThan(roma.y);
  });

  it("projetarRota com uma parada só fica no centro", () => {
    const [p] = projetarRota(roteiroPRD().pontos_mapa.slice(0, 1), 500, 200, 20);
    expect(p.x).toBeCloseTo(250);
    expect(p.y).toBeCloseTo(100);
  });
});
