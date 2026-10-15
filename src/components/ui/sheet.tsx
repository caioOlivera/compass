"use client";

// Sheet no padrão do shadcn/ui (Radix Dialog), adaptado aos tokens do Compass.
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export function SheetContent({
  className,
  children,
  side = "right",
  overlay = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "right" | "bottom";
  /** false = mapa continua clicável atrás do painel */
  overlay?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      {overlay && (
        <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 transition-opacity starting:opacity-0" />
      )}
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-surface shadow-xl outline-none",
          "transition ease-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
          side === "right" &&
            "inset-y-0 right-0 h-full w-full border-l border-border sm:max-w-md data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 starting:data-[state=open]:translate-x-full",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-border data-[state=closed]:translate-y-full data-[state=open]:translate-y-0 starting:data-[state=open]:translate-y-full",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-text-2 transition hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-accent">
          <XIcon className="size-5" aria-hidden />
          <span className="sr-only">Fechar</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-5 pr-12 pb-0", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-xl font-semibold tracking-tight", className)} {...props} />
  );
}

export function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-text-2", className)} {...props} />;
}
