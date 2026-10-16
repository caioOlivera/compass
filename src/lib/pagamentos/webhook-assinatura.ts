import { createHmac, timingSafeEqual } from "node:crypto";

// Validação do webhook do Mercado Pago: o header x-signature traz "ts=...,v1=..." e o v1 é o
// HMAC-SHA256 (com a chave secreta do painel) do texto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".

export function lerCabecalhoAssinatura(cabecalho: string): { ts?: string; v1?: string } {
  return Object.fromEntries(
    cabecalho
      .split(",")
      .map((p) => p.trim().split("="))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), v.trim()]),
  );
}

export function assinaturaValida(opcoes: {
  segredo: string;
  cabecalho: string;
  requestId: string;
  dataId: string;
  /** Rejeita avisos com ts mais antigo que isto (contra reenvio malicioso). */
  toleranciaMs?: number;
  agora?: number;
}): boolean {
  const { ts, v1 } = lerCabecalhoAssinatura(opcoes.cabecalho);
  if (!ts || !v1) return false;
  const tsMs = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
  if (!Number.isFinite(tsMs)) return false;
  if (opcoes.toleranciaMs && Math.abs((opcoes.agora ?? Date.now()) - tsMs) > opcoes.toleranciaMs) return false;
  const manifesto = `id:${opcoes.dataId.toLowerCase()};request-id:${opcoes.requestId};ts:${ts};`;
  const esperado = createHmac("sha256", opcoes.segredo).update(manifesto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
