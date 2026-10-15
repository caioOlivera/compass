import type { PontoMapa } from "@/lib/validation/itinerary";

// Partes puras do PDF do roteiro (testáveis sem renderizar).

/** A fonte do PDF não tem emoji: tira emojis e seletores de variação, e normaliza espaços. */
export function semEmoji(texto: string): string {
  return texto
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** "Itália de Roma às Dolomitas" → "italia-de-roma-as-dolomitas.pdf" */
export function nomeArquivoPdf(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "roteiro"}.pdf`;
}

export type PontoProjetado = { x: number; y: number; ponto: PontoMapa };

/**
 * Coloca as paradas numa caixa w×h (equiretangular com correção da latitude média), mantendo a
 * proporção real e centralizando. Uma parada só, ou todas no mesmo lugar, ficam no centro.
 */
export function projetarRota(pontos: PontoMapa[], w: number, h: number, margem = 24): PontoProjetado[] {
  if (pontos.length === 0) return [];
  const latMedia = pontos.reduce((s, p) => s + p.coordenadas.lat, 0) / pontos.length;
  const k = Math.cos((latMedia * Math.PI) / 180);
  const xs = pontos.map((p) => p.coordenadas.lng * k);
  const ys = pontos.map((p) => -p.coordenadas.lat);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const largura = maxX - minX;
  const altura = maxY - minY;
  const util = { w: w - 2 * margem, h: h - 2 * margem };
  const escala = largura === 0 && altura === 0 ? 0 : Math.min(util.w / (largura || Infinity), util.h / (altura || Infinity));
  const offX = margem + (util.w - largura * escala) / 2;
  const offY = margem + (util.h - altura * escala) / 2;
  return pontos.map((p, i) => ({ x: offX + (xs[i] - minX) * escala, y: offY + (ys[i] - minY) * escala, ponto: p }));
}
