import Link from "next/link";
import type * as React from "react";

export function AuthShell({ titulo, subtitulo, children, rodape }: {
  titulo: string;
  subtitulo?: React.ReactNode;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Link href="/" className="w-fit text-[28px] leading-none font-normal tracking-[-0.045em] text-text">
          compass
        </Link>
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {subtitulo && <p className="text-sm text-text-2">{subtitulo}</p>}
        </header>
        {children}
        {rodape && <footer className="text-sm text-text-2">{rodape}</footer>}
      </div>
    </main>
  );
}
