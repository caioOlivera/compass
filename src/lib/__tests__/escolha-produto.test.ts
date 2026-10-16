import { describe, expect, it } from "vitest";
import { produtoPadrao } from "@/components/wizard/escolha-produto";

describe("produto padrão no questionário", () => {
  const c = (roteiro: number, completo: number) => ({ modo: "creditos" as const, roteiro, completo, assinado: 0 });
  it("usa o pedido da URL só quando há crédito dele", () => {
    expect(produtoPadrao(c(1, 1), "completo")).toBe("completo");
    expect(produtoPadrao(c(1, 0), "completo")).toBe("roteiro");
  });
  it("sem pedido, prefere o roteiro; sem roteiro, o completo", () => {
    expect(produtoPadrao(c(2, 1))).toBe("roteiro");
    expect(produtoPadrao(c(0, 1))).toBe("completo");
  });
  it("plano, cortesia e lançamento não escolhem", () => {
    expect(produtoPadrao({ modo: "cortesia", roteiro: 0, completo: 0, assinado: 0 })).toBe("roteiro");
    expect(produtoPadrao(null)).toBe("roteiro");
  });
});
