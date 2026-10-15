import { z } from "zod";

// Formulários de autenticação. O telefone segue o mesmo padrão do check em profiles.phone.

// trim antes de validar: e-mail colado com espaço é comum no celular
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email("E-mail inválido"));

const senha = z
  .string()
  .min(8, "Use pelo menos 8 caracteres")
  .max(72, "Máximo de 72 caracteres");

export const CadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  email: EmailSchema,
  telefone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{8,20}$/, "Telefone inválido. Ex.: (21) 99999-0000"),
  senha,
});

export const LoginSenhaSchema = z.object({
  email: EmailSchema,
  senha: z.string().min(1, "Informe a senha"),
});

/** O Supabase gera códigos de 6 dígitos por padrão (configurável até 10). */
export const CodigoSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{6,10}$/, "Digite o código de 6 dígitos que chegou no e-mail"));

export type CadastroInput = z.infer<typeof CadastroSchema>;

/** Erros de campo para mostrar embaixo de cada input. */
export function errosPorCampo<T>(r: z.ZodSafeParseResult<T>): Partial<Record<string, string>> {
  if (r.success) return {};
  const out: Partial<Record<string, string>> = {};
  for (const i of r.error.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

/** Só aceita caminho interno ("/roteiros/123"); qualquer outra coisa vira o padrão. Evita open redirect. */
export function caminhoSeguro(next: string | null | undefined, padrao = "/roteiros"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return padrao;
  return next;
}

const MENSAGENS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Enviamos um código para você.",
  user_already_exists: "Já existe uma conta com este e-mail. Entre ou use “receber código”.",
  email_exists: "Já existe uma conta com este e-mail. Entre ou use “receber código”.",
  weak_password: "Senha fraca. Misture letras, números e símbolos.",
  otp_expired: "Código expirado ou incorreto. Peça um novo.",
  over_email_send_rate_limit: "Muitos e-mails em pouco tempo. Aguarde um minuto e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  signup_disabled: "Cadastros estão temporariamente fechados.",
  otp_disabled: "Login por código está desativado.",
  user_not_found: "Não encontramos conta com este e-mail. Crie uma conta.",
  email_address_invalid: "E-mail inválido.",
  validation_failed: "Confira os dados informados.",
};

/** Traduz o erro do Supabase Auth para uma frase para o usuário. */
export function mensagemErroAuth(erro: { code?: string; message?: string; name?: string } | null | undefined): string {
  if (!erro) return "";
  if (erro.code && MENSAGENS[erro.code]) return MENSAGENS[erro.code];
  // fetch falhou (sem internet, Supabase fora): o auth-js devolve esse nome, sem code
  if (erro.name === "AuthRetryableFetchError") return "Não conseguimos conectar. Verifique sua internet e tente de novo.";
  // signInWithOtp com shouldCreateUser: false para e-mail sem conta
  if (erro.message?.includes("Signups not allowed for otp")) return MENSAGENS.user_not_found;
  return "Algo deu errado. Tente de novo.";
}
