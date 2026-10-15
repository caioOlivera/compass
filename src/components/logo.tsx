import { Compass } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca do Compass: a bússola e o nome, no verde da identidade. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex w-fit items-center gap-2 text-lg font-semibold text-accent-strong", className)}>
      <Compass className="size-6" aria-hidden />
      Compass
    </Link>
  );
}
