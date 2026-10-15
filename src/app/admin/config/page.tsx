import { EditorConfig } from "@/components/admin/editor-config";
import { exigirAdmin } from "@/lib/admin";

export default async function ConfigPage() {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("configuracoes").select("chave, valor, descricao, updated_at").order("chave");
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-text-2">Números do negócio que mudam sem deploy: preços, ajustes inclusos, uso justo, câmbio e preço das APIs.</p>
      </header>
      <ul className="flex flex-col gap-4">
        {data?.map((c) => (
          <li key={c.chave} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <code className="text-sm font-semibold">{c.chave}</code>
              <span className="text-xs text-text-3">atualizado em {new Date(c.updated_at).toLocaleDateString("pt-BR")}</span>
            </div>
            {c.descricao && <p className="text-sm text-text-2">{c.descricao}</p>}
            <EditorConfig chave={c.chave} valor={JSON.stringify(c.valor, null, 2)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
