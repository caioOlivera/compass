import "server-only";
import { buscarFoto, type Foto } from "@/lib/images/fotos";
import { consultaDaParada, pontoDeCapa } from "@/lib/itinerary/fotos";
import type { FotoPdf, ImagemPdf } from "@/lib/pdf/roteiro-pdf";
import type { Itinerary } from "@/lib/validation/itinerary";

const LIMITE_BYTES = 3 * 1024 * 1024;

/** Os CDNs do Pexels e do Unsplash recortam pelo tamanho pedido na URL: imagens leves e em JPEG para o PDF. */
export function urlRecortada(url: string, w: number, h: number): string {
  try {
    const u = new URL(url);
    const tamanho = { fit: "crop", w: String(w), h: String(h) };
    let extras: Record<string, string>;
    if (u.hostname === "images.pexels.com") extras = { auto: "compress", cs: "tinysrgb" };
    else if (u.hostname === "images.unsplash.com") extras = { fm: "jpg", q: "80" };
    else return url;
    if (u.hostname === "images.unsplash.com") u.searchParams.delete("auto"); // auto=format pode virar WebP/AVIF
    for (const [k, v] of Object.entries({ ...extras, ...tamanho })) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return url;
  }
}

/** Baixa JPEG/PNG para embutir no PDF; qualquer falha vira null (o PDF sai sem a foto). */
export async function baixarImagem(url: string): Promise<ImagemPdf | null> {
  try {
    const r = await fetch(url, { headers: { Accept: "image/jpeg,image/png" }, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") ?? "";
    const format = tipo.includes("png") ? "png" : tipo.includes("jpeg") || tipo.includes("jpg") ? "jpg" : null;
    if (!format) return null;
    const data = Buffer.from(await r.arrayBuffer());
    return data.byteLength > LIMITE_BYTES ? null : { data, format };
  } catch {
    return null;
  }
}

async function paraPdf(foto: Foto | null, w: number, h: number): Promise<FotoPdf | null> {
  if (!foto) return null;
  const imagem = await baixarImagem(urlRecortada(foto.media, w, h));
  return imagem ? { imagem, autor: foto.autor, fonte: foto.fonte } : null;
}

/** Capa (foto do auge) e miniatura de cada parada, prontas para o PDF. */
export async function fotosParaPdf(roteiro: Itinerary) {
  const pontos = roteiro.pontos_mapa;
  const fotos = await Promise.all(pontos.map((p) => buscarFoto(consultaDaParada(p.nome_local), { idioma: "pt-BR" })));
  const idCapa = pontoDeCapa(roteiro).id_ponto;
  const [capa, ...minis] = await Promise.all([
    paraPdf(fotos[pontos.findIndex((p) => p.id_ponto === idCapa)], 1200, 500),
    ...fotos.map((f) => paraPdf(f, 240, 168)),
  ]);
  return { capa, miniaturas: Object.fromEntries(pontos.map((p, i) => [p.id_ponto, minis[i]])) };
}
