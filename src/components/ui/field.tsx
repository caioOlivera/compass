import { useId } from "react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-surface px-3 text-base transition outline-none sm:text-sm",
        "placeholder:text-text-3 focus:border-accent focus:ring-2 focus:ring-accent/25",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/20",
        className,
      )}
      {...props}
    />
  );
}

/** Label + input + dica + erro, ligados por id para leitores de tela. */
export function Field({
  label,
  erro,
  dica,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string; erro?: string; dica?: string }) {
  const id = useId();
  const idDescricao = `${id}-descricao`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input id={id} aria-invalid={!!erro || undefined} aria-describedby={erro || dica ? idDescricao : undefined} {...props} />
      {(erro || dica) && (
        <p id={idDescricao} className={cn("text-xs", erro ? "text-red-600" : "text-text-3")}>
          {erro ?? dica}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ children, tipo = "erro" }: { children: React.ReactNode; tipo?: "erro" | "info" }) {
  if (!children) return null;
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-3 py-2.5 text-sm",
        tipo === "erro" ? "bg-red-500/10 text-red-700" : "bg-accent/10 text-accent",
      )}
    >
      {children}
    </p>
  );
}
