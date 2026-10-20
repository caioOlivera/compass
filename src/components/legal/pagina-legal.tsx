import { Rodape } from "@/components/landing/fechamento";
import { SiteHeader } from "@/components/landing/site-header";
import { VERSAO_TERMOS } from "@/lib/empresa";

/** Moldura das páginas legais: título, data da versão e texto longo legível no celular. */
export function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const data = new Date(`${VERSAO_TERMOS}T12:00:00Z`).toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: "UTC" });
  return (
    <div className="bg-bg text-text">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="mt-2 text-sm text-text-2">Versão de {data}</p>
        <div className="legal mt-8 flex flex-col gap-4 leading-relaxed text-text-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text [&_table]:w-full [&_table]:text-sm [&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:text-text">
          {children}
        </div>
      </main>
      <Rodape creditos={[]} />
    </div>
  );
}
