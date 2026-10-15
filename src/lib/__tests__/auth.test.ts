import { describe, expect, it } from "vitest";
import {
  CadastroSchema,
  caminhoSeguro,
  CodigoSchema,
  errosPorCampo,
  mensagemErroAuth,
} from "@/lib/validation/auth";

describe("CadastroSchema", () => {
  const ok = { nome: "Ana Souza", email: " Ana@Email.com ", telefone: "(21) 99999-0000", senha: "viagem2026" };

  it("normaliza o e-mail", () => {
    expect(CadastroSchema.parse(ok).email).toBe("ana@email.com");
  });

  it("aceita telefone com DDI", () => {
    expect(CadastroSchema.safeParse({ ...ok, telefone: "+55 21 99999-0000" }).success).toBe(true);
  });

  it("erros por campo", () => {
    const r = CadastroSchema.safeParse({ ...ok, telefone: "abc", senha: "123" });
    expect(errosPorCampo(r)).toEqual({
      telefone: "Telefone inválido. Ex.: (21) 99999-0000",
      senha: "Use pelo menos 8 caracteres",
    });
  });
});

describe("CodigoSchema", () => {
  it("ignora espaços e traços colados do e-mail", () => {
    expect(CodigoSchema.parse(" 123 456 ")).toBe("123456");
    expect(CodigoSchema.parse("123-456")).toBe("123456");
  });

  it("recusa código curto", () => {
    expect(CodigoSchema.safeParse("12345").success).toBe(false);
  });
});

describe("caminhoSeguro", () => {
  it.each([
    ["/roteiros/abc", "/roteiros/abc"],
    ["/nova-viagem?x=1", "/nova-viagem?x=1"],
    ["//evil.com", "/roteiros"],
    ["/\\evil.com", "/roteiros"],
    ["https://evil.com", "/roteiros"],
    [null, "/roteiros"],
  ])("%s → %s", (entrada, saida) => {
    expect(caminhoSeguro(entrada)).toBe(saida);
  });
});

describe("mensagemErroAuth", () => {
  it("traduz pelo código", () => {
    expect(mensagemErroAuth({ code: "invalid_credentials" })).toBe("E-mail ou senha incorretos.");
  });

  it("OTP para e-mail sem conta", () => {
    expect(mensagemErroAuth({ message: "Signups not allowed for otp" })).toMatch(/Não encontramos conta/);
  });

  it("falha de rede", () => {
    expect(mensagemErroAuth({ name: "AuthRetryableFetchError", message: "Failed to fetch" })).toMatch(/conectar/);
  });

  it("erro desconhecido vira mensagem genérica", () => {
    expect(mensagemErroAuth({ code: "xyz", message: "boom" })).toBe("Algo deu errado. Tente de novo.");
  });
});
