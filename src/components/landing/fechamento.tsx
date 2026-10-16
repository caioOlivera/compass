import Link from "next/link";
import { Logo } from "@/components/logo";
import { FotoDestino } from "@/components/ui/foto";
import type { Foto } from "@/lib/images/fotos";

/** Chamada final sobre uma foto grande. */
export function ChamadaFinal({ foto }: { foto: Foto | null }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <FotoDestino foto={foto} tamanho="grande" corReserva="#1f6f5c" className="rounded-3xl">
        <div className="relative flex min-h-[380px] flex-col justify-end gap-5 bg-black/40 p-8 text-white sm:p-12">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Sua próxima viagem cabe em oito perguntas
          </h2>
          <p className="max-w-xl text-lg text-white/90">
            Conte para onde quer ir e qual lugar não pode faltar. O caminho, de uma porta à outra, é com a gente.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/cadastro"
              className="rounded-full bg-white px-6 py-3 font-semibold text-[#13140f] transition hover:bg-white/90 active:scale-[0.97]"
            >
              Montar meu roteiro
            </Link>
            <Link href="/exemplo" className="font-medium underline underline-offset-4 hover:text-white/80">
              Ver um exemplo pronto
            </Link>
          </div>
        </div>
      </FotoDestino>
    </section>
  );
}

export function Rodape({ creditos }: { creditos: Foto[] }) {
  // Crédito agrupado por banco: "Unsplash (Ana, Bruno)"
  const porFonte = new Map<string, { url: string; autores: Set<string> }>();
  for (const f of creditos) {
    const grupo = porFonte.get(f.fonte) ?? { url: f.fonteUrl, autores: new Set<string>() };
    grupo.autores.add(f.autor);
    porFonte.set(f.fonte, grupo);
  }
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-text-2">
            Roteiros de viagem fluidos, montados por IA e mostrados num mapa interativo. Feito no Brasil, saindo de São
            Paulo para o mundo.
          </p>
        </div>
        <nav aria-label="Produto" className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">Produto</p>
          <a href="/#regioes" className="text-text-2 hover:text-text">Destinos</a>
          <a href="/#como-funciona" className="text-text-2 hover:text-text">Como funciona</a>
          <Link href="/exemplo" className="text-text-2 hover:text-text">Exemplo de roteiro</Link>
          <Link href="/faq" className="text-text-2 hover:text-text">Perguntas frequentes</Link>
          <Link href="/ajuda" className="text-text-2 hover:text-text">Ajuda e suporte</Link>
        </nav>
        <nav aria-label="Conta" className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">Conta</p>
          <Link href="/cadastro" className="text-text-2 hover:text-text">Criar conta</Link>
          <Link href="/login" className="text-text-2 hover:text-text">Entrar</Link>
          <Link href="/agencias" className="text-text-2 hover:text-text">Para agências</Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-border px-4 py-5 text-xs text-text-2 sm:px-6">
        <p>© 2026 Compass. Roteiros sugeridos por IA: confira horários, preços e regras antes de comprar.</p>
        {[...porFonte].map(([fonte, { url, autores }]) => (
          <p key={fonte}>
            Fotos:{" "}
            <a href={url} target="_blank" rel="noreferrer" className="underline hover:text-text">
              {fonte}
            </a>{" "}
            ({[...autores].join(", ")}).
          </p>
        ))}
      </div>
    </footer>
  );
}
