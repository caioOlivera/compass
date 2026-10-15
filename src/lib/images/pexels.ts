import "server-only";

// Fotos de destinos pelo Pexels (fotos gratuitas, uso comercial permitido, crédito ao autor
// recomendado). Sem PEXELS_API_KEY, ou se o Pexels falhar, devolve null e a interface mostra o
// cartão sem foto: a página nunca quebra por causa de imagem.

export type Foto = {
  /** ~1880px de largura, para áreas grandes */
  grande: string;
  /** ~940px, para cartões */
  media: string;
  /** recorte retrato 800×1200 */
  retrato: string;
  alt: string;
  autor: string;
  autorUrl: string;
  paginaUrl: string;
  /** Cor média da foto: fundo enquanto carrega */
  cor: string;
};

type FotoPexels = {
  url: string;
  alt?: string;
  avg_color?: string;
  photographer: string;
  photographer_url: string;
  src: { large2x: string; large: string; portrait: string };
};

const UMA_SEMANA = 60 * 60 * 24 * 7;

export async function buscarFoto(
  consulta: string,
  opcoes: { orientacao?: "landscape" | "portrait" | "square"; idioma?: "pt-BR" | "en-US" } = {},
): Promise<Foto | null> {
  const chave = process.env.PEXELS_API_KEY;
  if (!chave || !consulta.trim()) return null;

  const params = new URLSearchParams({
    query: consulta,
    per_page: "1",
    orientation: opcoes.orientacao ?? "landscape",
    ...(opcoes.idioma ? { locale: opcoes.idioma } : {}),
  });

  try {
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: chave },
      // Cache do Next: a mesma busca não volta ao Pexels por uma semana (limite grátis: 200/hora)
      next: { revalidate: UMA_SEMANA, tags: ["pexels"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const dados = (await res.json()) as { photos?: FotoPexels[] };
    const f = dados.photos?.[0];
    return f ? converter(f, consulta) : null;
  } catch {
    return null;
  }
}

/** Várias buscas em paralelo; a posição de cada resultado corresponde à da consulta. */
export function buscarFotos(
  consultas: string[],
  opcoes?: Parameters<typeof buscarFoto>[1],
): Promise<(Foto | null)[]> {
  return Promise.all(consultas.map((c) => buscarFoto(c, opcoes)));
}

export function converter(f: FotoPexels, consulta: string): Foto {
  return {
    grande: f.src.large2x,
    media: f.src.large,
    retrato: f.src.portrait,
    alt: f.alt?.trim() || consulta,
    autor: f.photographer,
    autorUrl: f.photographer_url,
    paginaUrl: f.url,
    cor: f.avg_color ?? "#efede6",
  };
}
