// Marcador das telas que ainda serão implementadas nos próximos passos do roadmap (docs/ARCHITECTURE.md).
export function ComingSoon({ title, step }: { title: string; step: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-2 px-4 py-24">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-text-2">Em construção — {step}.</p>
    </main>
  );
}
