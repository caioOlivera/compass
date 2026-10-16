"use client";

import { Camera, Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { definirAvatar, salvarPerfil } from "@/app/actions/perfil";
import { Avatar } from "@/components/perfil/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { AVATAR_MAX_MB, AVATAR_MAX_ORIGINAL, AVATAR_TAMANHO_PX, caminhoAvatar } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/client";

type Props = {
  uid: string;
  email: string;
  nome: string;
  telefone: string;
  avatarUrl: string | null;
};

/** Recorta o centro da imagem em quadrado e reduz para 512px em JPEG: arquivo pequeno, qualquer origem. */
async function prepararFoto(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const saida = Math.min(AVATAR_TAMANHO_PX, lado);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = saida;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, saida, saida);
  bitmap.close();
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("toBlob"))), "image/jpeg", 0.88));
}

export function PerfilForm({ uid, email, nome, telefone, avatarUrl }: Props) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "info"; texto: string } | null>(null);
  const [salvando, iniciarSalvar] = useTransition();
  const [fotoOcupada, setFotoOcupada] = useState(false);
  const [previa, setPrevia] = useState<string | null>(null);
  const [nomeAtual, setNomeAtual] = useState(nome);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setMensagem(null);
    iniciarSalvar(async () => {
      const r = await salvarPerfil({ nome: String(dados.get("nome") ?? ""), telefone: String(dados.get("telefone") ?? "") });
      if (r.ok) {
        setErros({});
        setMensagem({ tipo: "info", texto: "Perfil salvo." });
        router.refresh();
      } else {
        setErros(r.erros ?? {});
        if (r.mensagem) setMensagem({ tipo: "erro", texto: r.mensagem });
      }
    });
  }

  async function trocarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setMensagem(null);
    if (!arquivo.type.startsWith("image/")) return setMensagem({ tipo: "erro", texto: "Escolha uma imagem (JPG, PNG ou WebP)." });
    if (arquivo.size > AVATAR_MAX_ORIGINAL) return setMensagem({ tipo: "erro", texto: `Imagem grande demais: o máximo é ${AVATAR_MAX_MB} MB.` });

    setFotoOcupada(true);
    try {
      const blob = await prepararFoto(arquivo);
      const caminho = caminhoAvatar(uid);
      const storage = createClient().storage.from("avatars");
      const { error } = await storage.upload(caminho, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      const r = await definirAvatar(caminho);
      if (!r.ok) {
        await storage.remove([caminho]);
        throw new Error(r.mensagem);
      }
      setPrevia(URL.createObjectURL(blob));
      setMensagem({ tipo: "info", texto: "Foto atualizada." });
      router.refresh();
    } catch (e) {
      const texto = e instanceof Error && e.message && !/canvas|toBlob/.test(e.message) ? e.message : "";
      setMensagem({ tipo: "erro", texto: texto || "Não foi possível enviar a foto. Tente outra imagem." });
    } finally {
      setFotoOcupada(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function removerFoto() {
    setFotoOcupada(true);
    setMensagem(null);
    const r = await definirAvatar(null);
    setFotoOcupada(false);
    if (!r.ok) return setMensagem({ tipo: "erro", texto: r.mensagem ?? "Não foi possível remover a foto." });
    setPrevia(null);
    router.refresh();
  }

  const fotoVisivel = previa ?? avatarUrl;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar url={fotoVisivel} nome={nomeAtual} email={email} className="size-24 text-3xl" />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-2">
            Aparece no topo do site. JPG, PNG ou WebP de até {AVATAR_MAX_MB} MB; recortamos em quadrado e reduzimos antes de enviar.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={entrada}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              id="foto-perfil"
              onChange={(e) => trocarFoto(e.target.files?.[0])}
            />
            <Button type="button" variante="secundario" carregando={fotoOcupada} onClick={() => entrada.current?.click()}>
              {!fotoOcupada && <Camera className="size-4" aria-hidden />}
              {fotoVisivel ? "Trocar foto" : "Adicionar foto"}
            </Button>
            {fotoVisivel && (
              <Button type="button" variante="fantasma" disabled={fotoOcupada} onClick={removerFoto}>
                <Trash2 className="size-4" aria-hidden />
                Remover
              </Button>
            )}
          </div>
        </div>
      </section>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Field
          label="Nome completo"
          name="nome"
          autoComplete="name"
          defaultValue={nome}
          onChange={(e) => setNomeAtual(e.target.value)}
          required
          erro={erros.nome}
        />
        <Field
          label="Telefone"
          name="telefone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="(21) 99999-0000"
          defaultValue={telefone}
          erro={erros.telefone}
        />
        <Field label="E-mail" name="email" type="email" value={email} readOnly disabled dica="É o seu login; não dá para trocar por aqui." />
        <FormAlert tipo={mensagem?.tipo}>
          {mensagem && (
            <span className="inline-flex items-center gap-1.5">
              {mensagem.tipo === "info" && <Check className="size-4" aria-hidden />}
              {mensagem.texto}
            </span>
          )}
        </FormAlert>
        <Button type="submit" carregando={salvando} className="self-start">
          Salvar alterações
        </Button>
      </form>
    </div>
  );
}
