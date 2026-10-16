import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaValida, lerCabecalhoAssinatura } from "@/lib/pagamentos/webhook-assinatura";

const segredo = "segredo-teste";
const assinar = (dataId: string, requestId: string, ts: string) =>
  createHmac("sha256", segredo).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");

describe("assinatura do webhook do Mercado Pago", () => {
  it("lê o cabeçalho ts/v1", () => {
    expect(lerCabecalhoAssinatura("ts=1704908010,v1=abc")).toEqual({ ts: "1704908010", v1: "abc" });
  });

  it("aceita a assinatura certa (data.id em minúsculas) e recusa adulterada", () => {
    const v1 = assinar("abc123", "req-1", "1704908010");
    expect(assinaturaValida({ segredo, cabecalho: `ts=1704908010,v1=${v1}`, requestId: "req-1", dataId: "ABC123" })).toBe(true);
    expect(assinaturaValida({ segredo, cabecalho: `ts=1704908010,v1=${v1}`, requestId: "req-2", dataId: "abc123" })).toBe(false);
    expect(assinaturaValida({ segredo: "outro", cabecalho: `ts=1704908010,v1=${v1}`, requestId: "req-1", dataId: "abc123" })).toBe(false);
    expect(assinaturaValida({ segredo, cabecalho: "v1=xyz", requestId: "req-1", dataId: "abc123" })).toBe(false);
  });

  it("recusa aviso muito antigo quando há tolerância", () => {
    const ts = "1704908010";
    const v1 = assinar("1", "r", ts);
    expect(assinaturaValida({ segredo, cabecalho: `ts=${ts},v1=${v1}`, requestId: "r", dataId: "1", toleranciaMs: 600_000, agora: 1704908010_000 + 60_000 })).toBe(true);
    expect(assinaturaValida({ segredo, cabecalho: `ts=${ts},v1=${v1}`, requestId: "r", dataId: "1", toleranciaMs: 600_000, agora: 1704908010_000 + 3_600_000 })).toBe(false);
  });
});
