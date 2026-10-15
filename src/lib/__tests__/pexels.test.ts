import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarFoto, buscarFotos } from "@/lib/images/pexels";

const fotoPexels = {
  url: "https://www.pexels.com/photo/dolomitas-123/",
  alt: "Montanhas ao pôr do sol",
  avg_color: "#7A8B99",
  photographer: "Ana Fotógrafa",
  photographer_url: "https://www.pexels.com/@ana",
  src: {
    large2x: "https://images.pexels.com/photos/123/a.jpeg?w=1880",
    large: "https://images.pexels.com/photos/123/a.jpeg?w=940",
    portrait: "https://images.pexels.com/photos/123/a.jpeg?w=800&h=1200",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("buscarFoto", () => {
  it("sem chave não chama o Pexels e devolve null", async () => {
    vi.stubEnv("PEXELS_API_KEY", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await buscarFoto("Dolomites")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("converte a primeira foto e manda a chave e a orientação", async () => {
    vi.stubEnv("PEXELS_API_KEY", "chave-teste");
    const f = vi.fn(async () => Response.json({ photos: [fotoPexels] }));
    vi.stubGlobal("fetch", f);

    const foto = await buscarFoto("Dolomites", { orientacao: "portrait" });
    expect(foto).toMatchObject({
      media: fotoPexels.src.large,
      retrato: fotoPexels.src.portrait,
      autor: "Ana Fotógrafa",
      cor: "#7A8B99",
      alt: "Montanhas ao pôr do sol",
    });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("query=Dolomites");
    expect(url).toContain("orientation=portrait");
    expect((init.headers as Record<string, string>).Authorization).toBe("chave-teste");
  });

  it("erro HTTP, resposta vazia ou falha de rede viram null", async () => {
    vi.stubEnv("PEXELS_API_KEY", "chave-teste");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("limite", { status: 429 })));
    expect(await buscarFoto("x")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ photos: [] })));
    expect(await buscarFoto("x")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await buscarFoto("x")).toBeNull();
  });

  it("buscarFotos mantém a ordem das consultas", async () => {
    vi.stubEnv("PEXELS_API_KEY", "chave-teste");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("vazio") ? Response.json({ photos: [] }) : Response.json({ photos: [fotoPexels] }),
      ),
    );
    const r = await buscarFotos(["Roma", "vazio", "Milão"]);
    expect(r.map((x) => x?.autor ?? null)).toEqual(["Ana Fotógrafa", null, "Ana Fotógrafa"]);
  });
});
