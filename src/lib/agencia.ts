import { z } from "zod";

// Marca da agência (B2B): nome, cor e contato que aparecem no PDF enviado ao cliente final.

export const ContatoSchema = z.object({
  email: z.union([z.literal(""), z.email("E-mail inválido")]).default(""),
  telefone: z.string().trim().max(30).default(""),
  site: z.union([z.literal(""), z.url("Site inválido (comece com https://)")]).default(""),
  instagram: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v.replace(/^@/, ""))
    .default(""),
});

export const MarcaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da agência").max(120),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  contato: ContatoSchema,
});

export type Marca = z.infer<typeof MarcaSchema>;
export type Contato = z.infer<typeof ContatoSchema>;

export function urlDoLogo(caminho: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!caminho || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/marcas/${caminho.split("/").map(encodeURIComponent).join("/")}`;
}

/** Linha de contato para rodapés: "contato@x.com · (62) 9... · @agencia · site.com" */
export function linhaContato(c: Partial<Contato> | null | undefined): string {
  if (!c) return "";
  return [c.email, c.telefone, c.instagram ? `@${c.instagram}` : "", c.site?.replace(/^https?:\/\//, "").replace(/\/$/, "")]
    .filter(Boolean)
    .join(" · ");
}
