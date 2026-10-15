import "server-only";
import { buscarFoto, type Foto } from "@/lib/images/pexels";
import { consultaDaParada, pontoDeCapa } from "@/lib/itinerary/fotos";
import type { FotoPdf, ImagemPdf } from "@/lib/pdf/roteiro-pdf";
import type { Itinerary } from "@/lib/validation/itinerary";

const LIMITE_BYTES = 3 * 1024 * 1024;

/** O CDN do Pexels recorta pelo tamanho pedido na URL: miniaturas leves para o PDF. */
export function urlRecortada(url: string, w: number, h: number): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "images.pexels.com") return url;
    u.searchParams.set("auto", "compress");
    u.searchParams.set("cs", "tinysrgb");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("w", String(w));
    u.searchParams.set("h", String(h));
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
  return imagem ? { imagem, autor: foto.autor } : null;
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
