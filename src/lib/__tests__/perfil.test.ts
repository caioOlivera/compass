import { afterEach, describe, expect, it, vi } from "vitest";
import { avatarDoDono, caminhoAvatar, iniciais, PerfilSchema, urlDoAvatar } from "@/lib/perfil";

const UID = "4f1c2a3b-0000-4000-8000-123456789abc";

describe("perfil", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("valida nome e telefone (vazio vira null)", () => {
    expect(PerfilSchema.parse({ nome: "  Ana ", telefone: "" })).toEqual({ nome: "Ana", telefone: null });
    expect(PerfilSchema.parse({ nome: "Ana", telefone: "(21) 99999-0000" }).telefone).toBe("(21) 99999-0000");
    expect(PerfilSchema.safeParse({ nome: "A", telefone: "" }).success).toBe(false);
    expect(PerfilSchema.safeParse({ nome: "Ana", telefone: "abc" }).success).toBe(false);
  });

  it("caminho do avatar fica na pasta do dono", () => {
    const c = caminhoAvatar(UID, 123);
    expect(c).toBe(`${UID}/avatar-123.jpg`);
    expect(avatarDoDono(UID, c)).toBe(true);
    expect(avatarDoDono("outro", c)).toBe(false);
    expect(avatarDoDono(UID, `${UID}/../x.jpg`)).toBe(false);
    expect(avatarDoDono(UID, `${UID}/a/b.jpg`)).toBe(false);
    expect(avatarDoDono(UID, `${UID}/.oculto`)).toBe(false);
  });

  it("URL pública do avatar", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co/");
    expect(urlDoAvatar(`${UID}/avatar-1.jpg`)).toBe(`https://x.supabase.co/storage/v1/object/public/avatars/${UID}/avatar-1.jpg`);
    expect(urlDoAvatar(null)).toBeNull();
  });

  it("iniciais", () => {
    expect(iniciais("Ana Maria Souza")).toBe("AS");
    expect(iniciais("caio")).toBe("C");
    expect(iniciais("", "zé@x.com")).toBe("Z");
    expect(iniciais("")).toBe("?");
  });
});
