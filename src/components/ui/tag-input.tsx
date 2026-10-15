"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  valores: string[];
  onChange: (valores: string[]) => void;
  placeholder?: string;
  dica?: string;
  erro?: string;
  max?: number;
  tom?: "neutro" | "negativo";
};

/** Lista de locais: Enter ou vírgula adiciona, Backspace no campo vazio remove o último. */
export function TagInput({ label, valores, onChange, placeholder, dica, erro, max = 15, tom = "neutro" }: Props) {
  const id = useId();
  const [texto, setTexto] = useState("");

  function adicionar(bruto: string) {
    const novos = bruto
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && !valores.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (novos.length) onChange([...valores, ...novos].slice(0, max));
    setTexto("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 transition",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25",
          erro && "border-red-500",
        )}
      >
        {valores.map((v) => (
          <span
            key={v}
            className={cn(
              "inline-flex items-center gap-1 rounded-md py-1 pr-1 pl-2 text-sm",
              tom === "negativo" ? "bg-red-500/10 text-red-700 line-through decoration-red-700/40" : "bg-accent/10 text-accent",
            )}
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(valores.filter((x) => x !== v))}
              className="rounded p-0.5 hover:bg-black/5"
              aria-label={`Remover ${v}`}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={texto}
          onChange={(e) => (e.target.value.includes(",") ? adicionar(e.target.value) : setTexto(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar(texto);
            } else if (e.key === "Backspace" && !texto && valores.length) {
              onChange(valores.slice(0, -1));
            }
          }}
          onBlur={() => texto && adicionar(texto)}
          placeholder={valores.length ? "" : placeholder}
          disabled={valores.length >= max}
          aria-invalid={!!erro || undefined}
          aria-describedby={`${id}-ajuda`}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-base outline-none placeholder:text-text-3 sm:text-sm"
        />
      </div>
      <p id={`${id}-ajuda`} className={cn("text-xs", erro ? "text-red-600" : "text-text-3")}>
        {erro ?? dica}
      </p>
    </div>
  );
}
