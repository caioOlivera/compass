import type * as React from "react";
import type { Foto } from "@/lib/images/fotos";
import { cn } from "@/lib/utils";

type Props = {
  foto: Foto | null | undefined;
  tamanho?: "grande" | "media" | "retrato";
  /** Mostrado no lugar da foto quando não há (sem chave do banco de fotos ou busca vazia) */
  emoji?: string;
  /** Cor do cartão sem foto */
  corReserva?: string;
  className?: string;
  prioridade?: boolean;
  /** Classes extras da <img> (ex.: zoom no hover do cartão) */
  imgClassName?: string;
  children?: React.ReactNode;
};

/**
 * Foto de destino ocupando o contêiner, com o crédito do autor no title.
 * Sem foto, vira um bloco de cor com o emoji do lugar, no mesmo tamanho.
 */
export function FotoDestino({
  foto,
  tamanho = "media",
  emoji,
  corReserva,
  className,
  prioridade,
  imgClassName,
  children,
}: Props) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: foto?.cor ?? corReserva ?? "var(--surface-2)" }}
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- fotos externas (Unsplash/Pexels), já em tamanho certo
        <img
          src={foto[tamanho]}
          alt={foto.alt}
          title={`Foto: ${foto.autor} / ${foto.fonte}`}
          loading={prioridade ? "eager" : "lazy"}
          decoding="async"
          className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
        />
      ) : (
        emoji && (
          <span className="absolute inset-0 flex items-center justify-center text-[clamp(3rem,8vw,5rem)]" aria-hidden>
            {emoji}
          </span>
        )
      )}
      {children}
    </div>
  );
}

/** Legenda sobre a foto: faixa escura sólida embaixo, texto claro. */
export function LegendaFoto({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("absolute inset-x-0 bottom-0 bg-black/45 px-4 py-3 text-white backdrop-blur-[2px]", className)}>
      {children}
    </div>
  );
}
