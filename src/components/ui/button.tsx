import { Loader2 } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

type Variante = "primario" | "secundario" | "fantasma";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-accent text-accent-contrast hover:opacity-90",
  secundario: "border border-border bg-surface hover:bg-surface-2",
  fantasma: "text-text-2 hover:bg-surface-2 hover:text-text",
};

export function Button({
  className,
  variante = "primario",
  carregando = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> & { variante?: Variante; carregando?: boolean }) {
  return (
    <button
      data-slot="button"
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTES[variante],
        className,
      )}
      {...props}
    >
      {carregando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
