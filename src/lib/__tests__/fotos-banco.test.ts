import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarFoto, buscarFotos } from "@/lib/images/fotos";

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
  it("sem chave não chama nenhum banco e devolve null", async () => {
    vi.stubEnv("PEXELS_API_KEY", "");
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "");
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
      fonte: "Pexels",
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

const fotoUnsplash = {
  alt_description: "lago entre montanhas",
  color: "#40593f",
  urls: { raw: "https://images.unsplash.com/photo-1?ixid=abc" },
  links: { html: "https://unsplash.com/photos/abc" },
  user: { name: "Bruno Lima", links: { html: "https://unsplash.com/@bruno" } },
};

describe("buscarFoto com Unsplash", () => {
  it("usa a chave do Unsplash e monta tamanhos e créditos com UTM", async () => {
    vi.stubEnv("PEXELS_API_KEY", "");
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "chave-u");
    const f = vi.fn(async () => Response.json({ results: [fotoUnsplash] }));
    vi.stubGlobal("fetch", f);

    const foto = await buscarFoto("Florença", { orientacao: "square", idioma: "pt-BR" });
    expect(foto).toMatchObject({ autor: "Bruno Lima", fonte: "Unsplash", cor: "#40593f", alt: "lago entre montanhas" });
    expect(foto!.media).toContain("w=900");
    expect(foto!.media).toContain("ixid=abc");
    expect(foto!.retrato).toMatch(/w=800.*h=1200.*fit=crop/);
    expect(foto!.autorUrl).toBe("https://unsplash.com/@bruno?utm_source=compass&utm_medium=referral");
    expect(foto!.fonteUrl).toContain("utm_source=compass");

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("api.unsplash.com/search/photos");
    expect(url).toContain("orientation=squarish");
    expect(url).toContain("lang=pt");
    expect((init.headers as Record<string, string>).Authorization).toBe("Client-ID chave-u");
  });

  it("com as duas chaves, cai no Unsplash quando o Pexels não acha", async () => {
    vi.stubEnv("PEXELS_API_KEY", "chave-p");
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "chave-u");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("pexels") ? new Response("", { status: 429 }) : Response.json({ results: [fotoUnsplash] }),
      ),
    );
    expect((await buscarFoto("Roma"))?.fonte).toBe("Unsplash");
  });
});
