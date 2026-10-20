"use client";

import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { excluirMinhaConta } from "@/app/actions/conta";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

/** Direitos do titular no perfil: baixar os dados e excluir a conta. */
export function PrivacidadeConta() {
  const [abrir, setAbrir] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-medium">Seus dados</h2>
      <p className="text-sm text-text-2">
        Você pode baixar tudo o que guardamos sobre você ou excluir a conta. Detalhes na{" "}
        <Link href="/privacidade" className="text-accent-strong hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="/api/meus-dados" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-accent-strong hover:underline">
          <Download className="size-4" aria-hidden /> Baixar meus dados
        </a>
        {!abrir && (
          <button type="button" onClick={() => setAbrir(true)} className="inline-flex min-h-11 items-center gap-1.5 text-red-700 hover:underline">
            <Trash2 className="size-4" aria-hidden /> Excluir minha conta
          </button>
        )}
      </div>
      {abrir && (
        <form
          className="flex flex-col gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              setErro("");
              const r = await excluirMinhaConta(texto);
              if (r && !r.ok) setErro(r.mensagem);
            });
          }}
        >
          <p>
            Apagamos seus roteiros, consultas, créditos, chamados e foto. Créditos não usados são perdidos. Os comprovantes de
            pagamento ficam guardados por 5 anos, sem seu nome ou e-mail, porque a lei exige. Não dá para desfazer.
          </p>
          <label className="flex flex-col gap-1.5 font-medium">
            Digite EXCLUIR para confirmar
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              className="h-11 rounded-lg border border-red-300 bg-bg px-3 font-normal text-text"
            />
          </label>
          <FormAlert>{erro}</FormAlert>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" carregando={ocupado} disabled={texto.trim().toUpperCase() !== "EXCLUIR"} className="bg-red-700 text-white">
              Excluir minha conta
            </Button>
            <button type="button" onClick={() => setAbrir(false)} className="text-text-2 hover:text-text">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
