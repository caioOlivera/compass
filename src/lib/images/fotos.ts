import "server-only";

// Fotos de destinos de bancos gratuitos (uso comercial permitido, com crédito ao autor):
// Unsplash (UNSPLASH_ACCESS_KEY) e Pexels (PEXELS_API_KEY). Usa o que tiver chave; com as duas,
// tenta o Pexels e cai no Unsplash. Sem chave, ou se a busca falhar, devolve null e a interface
// mostra o cartão sem foto: a página nunca quebra por causa de imagem.

export type FonteFoto = "Unsplash" | "Pexels";

export type Foto = {
  /** ~1600–1900px de largura, para áreas grandes */
  grande: string;
  /** ~900px, para cartões */
  media: string;
  /** recorte retrato 800×1200 */
  retrato: string;
  alt: string;
  autor: string;
  autorUrl: string;
  paginaUrl: string;
  /** Cor média da foto: fundo enquanto carrega */
  cor: string;
  fonte: FonteFoto;
  fonteUrl: string;
};

export type OpcoesBusca = { orientacao?: "landscape" | "portrait" | "square"; idioma?: "pt-BR" | "en-US" };

const UMA_SEMANA = 60 * 60 * 24 * 7;
// O Unsplash pede estes parâmetros nos links de crédito
const UTM = "utm_source=compass&utm_medium=referral";

// ---------------------------------------------------------------------------------------------
// Pexels

type FotoPexels = {
  url: string;
  alt?: string;
  avg_color?: string;
  photographer: string;
  photographer_url: string;
  src: { large2x: string; large: string; portrait: string };
};

async function buscarPexels(consulta: string, opcoes: OpcoesBusca, chave: string): Promise<Foto | null> {
  const params = new URLSearchParams({
    query: consulta,
    per_page: "1",
    orientation: opcoes.orientacao ?? "landscape",
    ...(opcoes.idioma ? { locale: opcoes.idioma } : {}),
  });
  const dados = await buscarJson<{ photos?: FotoPexels[] }>(`https://api.pexels.com/v1/search?${params}`, {
    Authorization: chave,
  });
  const f = dados?.photos?.[0];
  return f ? converterPexels(f, consulta) : null;
}

export function converterPexels(f: FotoPexels, consulta: string): Foto {
  return {
    grande: f.src.large2x,
    media: f.src.large,
    retrato: f.src.portrait,
    alt: f.alt?.trim() || consulta,
    autor: f.photographer,
    autorUrl: f.photographer_url,
    paginaUrl: f.url,
    cor: f.avg_color ?? "#efede6",
    fonte: "Pexels",
    fonteUrl: "https://www.pexels.com",
  };
}

// ---------------------------------------------------------------------------------------------
// Unsplash

type FotoUnsplash = {
  alt_description?: string | null;
  description?: string | null;
  color?: string | null;
  urls: { raw: string };
  links: { html: string };
  user: { name: string; links: { html: string } };
};

async function buscarUnsplash(consulta: string, opcoes: OpcoesBusca, chave: string): Promise<Foto | null> {
  const params = new URLSearchParams({
    query: consulta,
    per_page: "1",
    content_filter: "high",
    orientation: opcoes.orientacao === "square" ? "squarish" : (opcoes.orientacao ?? "landscape"),
    ...(opcoes.idioma === "pt-BR" ? { lang: "pt" } : {}),
  });
  const dados = await buscarJson<{ results?: FotoUnsplash[] }>(`https://api.unsplash.com/search/photos?${params}`, {
    Authorization: `Client-ID ${chave}`,
    "Accept-Version": "v1",
  });
  const f = dados?.results?.[0];
  return f ? converterUnsplash(f, consulta) : null;
}

/** O CDN do Unsplash (imgix) gera cada tamanho a partir da URL "raw". */
function tamanhoUnsplash(raw: string, params: Record<string, string>): string {
  const u = new URL(raw);
  for (const [k, v] of Object.entries({ auto: "format", q: "80", ...params })) u.searchParams.set(k, v);
  return u.toString();
}

function comUtm(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + UTM;
}

export function converterUnsplash(f: FotoUnsplash, consulta: string): Foto {
  return {
    grande: tamanhoUnsplash(f.urls.raw, { w: "1600" }),
    media: tamanhoUnsplash(f.urls.raw, { w: "900" }),
    retrato: tamanhoUnsplash(f.urls.raw, { w: "800", h: "1200", fit: "crop" }),
    alt: f.alt_description?.trim() || f.description?.trim() || consulta,
    autor: f.user.name,
    autorUrl: comUtm(f.user.links.html),
    paginaUrl: comUtm(f.links.html),
    cor: f.color ?? "#efede6",
    fonte: "Unsplash",
    fonteUrl: comUtm("https://unsplash.com"),
  };
}

// ---------------------------------------------------------------------------------------------

async function buscarJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers,
      // Cache do Next: a mesma busca não volta ao banco por uma semana (os limites grátis são por hora)
      next: { revalidate: UMA_SEMANA, tags: ["fotos"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function buscarFoto(consulta: string, opcoes: OpcoesBusca = {}): Promise<Foto | null> {
  if (!consulta.trim()) return null;
  const pexels = process.env.PEXELS_API_KEY;
  const unsplash = process.env.UNSPLASH_ACCESS_KEY;
  if (pexels) {
    const f = await buscarPexels(consulta, opcoes, pexels);
    if (f) return f;
  }
  if (unsplash) return buscarUnsplash(consulta, opcoes, unsplash);
  return null;
}

/** Várias buscas em paralelo; a posição de cada resultado corresponde à da consulta. */
export function buscarFotos(consultas: string[], opcoes?: OpcoesBusca): Promise<(Foto | null)[]> {
  return Promise.all(consultas.map((c) => buscarFoto(c, opcoes)));
}
