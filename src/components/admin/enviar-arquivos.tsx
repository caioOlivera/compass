"use client";

import { unzipSync } from "fflate";
import { CheckCircle2, CircleAlert, FileText, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { processarFonte, type ResultadoProcessamento } from "@/app/actions/base";
import { Button } from "@/components/ui/button";
import type { TipoFonte } from "@/lib/conhecimento/ingestao";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EXTENSOES = [".txt", ".md", ".csv", ".pdf", ".docx"];
const TIPOS: { valor: TipoFonte; rotulo: string; dica: string }[] = [
  { valor: "relato_comunidade", rotulo: "Relatos da comunidade", dica: "Conteúdo de terceiros: entra resumido, sem nomes." },
  { valor: "roteiro_proprio", rotulo: "Roteiro meu", dica: "Vira roteiro assinado (vendido a R$ 14,90)." },
  { valor: "anotacao_propria", rotulo: "Anotações minhas", dica: "Dicas e estudos próprios." },
  { valor: "consultoria", rotulo: "Consultoria feita", dica: "Material de uma consultoria." },
];

type Linha = { nome: string; estado: "fila" | "enviando" | "extraindo" | ResultadoProcessamento["estado"]; detalhe?: string; ingestaoId?: string };

/** Abre .zip no navegador e devolve só os arquivos aceitos (ignora pastas e lixo do macOS). */
function arquivosDoZip(zip: ArrayBuffer): File[] {
  const entradas = unzipSync(new Uint8Array(zip));
  return Object.entries(entradas)
    .filter(([caminho, bytes]) => bytes.length > 0 && !caminho.includes("__MACOSX") && !caminho.split("/").pop()!.startsWith("."))
    .filter(([caminho]) => EXTENSOES.some((e) => caminho.toLowerCase().endsWith(e)))
    .map(([caminho, bytes]) => new File([bytes], caminho.split("/").pop()!));
}

/** Nome seguro para o Storage, preservando a extensão. */
function caminhoNoStorage(nome: string): string {
  const ext = nome.slice(nome.lastIndexOf(".")).toLowerCase();
  const base = nome
    .slice(0, nome.lastIndexOf("."))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${base || "arquivo"}${ext}`;
}

export function EnviarArquivos() {
  const entrada = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoFonte>("relato_comunidade");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [rodando, setRodando] = useState(false);

  const atualizar = (i: number, parcial: Partial<Linha>) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...parcial } : l)));

  async function enviar(lista: FileList | null) {
    if (!lista?.length) return;
    const arquivos: File[] = [];
    for (const f of Array.from(lista)) {
      if (f.name.toLowerCase().endsWith(".zip")) arquivos.push(...arquivosDoZip(await f.arrayBuffer()));
      else if (EXTENSOES.some((e) => f.name.toLowerCase().endsWith(e))) arquivos.push(f);
    }
    if (entrada.current) entrada.current.value = "";
    if (!arquivos.length) return;

    const inicio = linhas.length;
    setLinhas((ls) => [...ls, ...arquivos.map((f) => ({ nome: f.name, estado: "fila" as const }))]);
    setRodando(true);
    const storage = createClient().storage.from("fontes");

    // Um por vez: cada extração leva de segundos a um minuto e o plano grátis da IA tem limite por minuto
    for (let k = 0; k < arquivos.length; k++) {
      const i = inicio + k;
      const arquivo = arquivos[k];
      try {
        atualizar(i, { estado: "enviando" });
        const caminho = caminhoNoStorage(arquivo.name);
        const up = await storage.upload(caminho, arquivo, { contentType: arquivo.type || "application/octet-stream" });
        if (up.error) throw new Error(up.error.message);

        atualizar(i, { estado: "extraindo" });
        const r = await processarFonte({ caminho, nome: arquivo.name, tipo });
        if (r.estado === "ok") atualizar(i, { estado: "ok", detalhe: `${r.itens} itens para revisar`, ingestaoId: r.ingestaoId });
        else if (r.estado === "duplicado") atualizar(i, { estado: "duplicado", detalhe: `Já enviado antes (${r.titulo})` });
        else atualizar(i, { estado: "erro", detalhe: r.mensagem });
      } catch (e) {
        atualizar(i, { estado: "erro", detalhe: e instanceof Error ? e.message : "Falha no envio" });
      }
    }
    setRodando(false);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">O que você está enviando?</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TIPOS.map((t) => (
            <label
              key={t.valor}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-sm transition",
                tipo === t.valor ? "border-accent bg-accent/5" : "border-border hover:border-text-3",
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="tipo-fonte"
                  value={t.valor}
                  checked={tipo === t.valor}
                  onChange={() => setTipo(t.valor)}
                  className="accent-[var(--accent)]"
                />
                {t.rotulo}
              </span>
              <span className="text-xs text-text-2">{t.dica}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={entrada}
          type="file"
          multiple
          accept={[...EXTENSOES, ".zip"].join(",")}
          className="sr-only"
          id="arquivos-base"
          onChange={(e) => enviar(e.target.files)}
        />
        <Button type="button" onClick={() => entrada.current?.click()} disabled={rodando}>
          <Upload className="size-4" aria-hidden />
          Escolher arquivos
        </Button>
        <p className="text-sm text-text-2">PDF, DOCX, TXT, MD, CSV ou um .zip com vários. A IA propõe; você aprova na revisão.</p>
      </div>

      {linhas.length > 0 && (
        <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto rounded-xl border border-border bg-bg text-sm">
          {linhas.map((l, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2">
              <Icone estado={l.estado} />
              <span className="min-w-0 flex-1 truncate">{l.nome}</span>
              <span className={cn("shrink-0 text-xs", l.estado === "erro" ? "text-red-600" : "text-text-2")}>
                {l.ingestaoId ? (
                  <Link href={`/admin/base/revisao?ingestao=${l.ingestaoId}`} className="text-accent-strong underline">
                    {l.detalhe}
                  </Link>
                ) : (
                  (l.detalhe ?? ROTULO[l.estado])
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ROTULO: Record<Linha["estado"], string> = {
  fila: "Na fila",
  enviando: "Enviando…",
  extraindo: "Lendo com a IA…",
  ok: "Pronto",
  duplicado: "Duplicado",
  erro: "Erro",
};

function Icone({ estado }: { estado: Linha["estado"] }) {
  if (estado === "ok") return <CheckCircle2 className="size-4 shrink-0 text-accent-strong" aria-hidden />;
  if (estado === "erro") return <CircleAlert className="size-4 shrink-0 text-red-600" aria-hidden />;
  if (estado === "enviando" || estado === "extraindo") return <Loader2 className="size-4 shrink-0 animate-spin text-text-2" aria-hidden />;
  return <FileText className="size-4 shrink-0 text-text-3" aria-hidden />;
}
