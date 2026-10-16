import { z } from "zod";

// Perfil: nome, telefone e foto. O e-mail vem do Auth e não é editado aqui.

export const PerfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120, "Máximo de 120 caracteres"),
  // Vazio = sem telefone. Mesmo padrão do check em profiles.phone.
  telefone: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^\+?[0-9 ()-]{8,20}$/, "Telefone inválido. Ex.: (21) 99999-0000").nullable()),
});

export type PerfilInput = z.input<typeof PerfilSchema>;

export const AVATAR_TAMANHO_PX = 512;
export const AVATAR_TIPOS = ["image/jpeg", "image/png", "image/webp"] as const;
/** Limite do arquivo escolhido (antes de reduzir no navegador). */
export const AVATAR_MAX_ORIGINAL = 20 * 1024 * 1024;
export const AVATAR_MAX_MB = 20;

/** Caminho do arquivo no bucket: sempre dentro da pasta da pessoa, nome novo a cada troca (evita cache velho). */
export function caminhoAvatar(uid: string, agora = Date.now()): string {
  return `${uid}/avatar-${agora}.jpg`;
}

/** Igual ao check do banco: `<uid>/<nome-simples>`. */
export function avatarDoDono(uid: string, caminho: string): boolean {
  const [pasta, arquivo, ...resto] = caminho.split("/");
  return pasta === uid && resto.length === 0 && /^[A-Za-z0-9._-]{1,80}$/.test(arquivo ?? "") && !arquivo.startsWith(".");
}

export function urlDoAvatar(caminho: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!caminho || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/avatars/${caminho.split("/").map(encodeURIComponent).join("/")}`;
}

/** "Ana Maria Souza" → "AS"; vazio → e-mail → "?" */
export function iniciais(nome: string, email = ""): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return (email.trim()[0] ?? "?").toUpperCase();
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}
