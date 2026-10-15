import { iniciais } from "@/lib/perfil";
import { cn } from "@/lib/utils";

/** Foto de perfil redonda; sem foto, as iniciais sobre o verde da marca. */
export function Avatar({ url, nome, email, className }: { url: string | null; nome: string; email?: string; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-accent-contrast select-none",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage, já reduzida no envio
        <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden>{iniciais(nome, email)}</span>
      )}
    </span>
  );
}
