// Dados de quem controla os dados pessoais (LGPD) e da versão dos documentos legais.
// Preencha RAZAO_SOCIAL, CNPJ e ENDERECO antes de abrir para o público (variáveis na Vercel).

export const VERSAO_TERMOS = "2026-10-18";

export const EMPRESA = {
  nome: "Compass",
  razaoSocial: process.env.NEXT_PUBLIC_EMPRESA_RAZAO_SOCIAL || "[razão social a preencher]",
  cnpj: process.env.NEXT_PUBLIC_EMPRESA_CNPJ || "[CNPJ a preencher]",
  endereco: process.env.NEXT_PUBLIC_EMPRESA_ENDERECO || "[endereço a preencher]",
  /** Canal do encarregado (LGPD art. 41) e dos pedidos de titulares */
  emailPrivacidade: process.env.NEXT_PUBLIC_EMAIL_PRIVACIDADE || "[e-mail de privacidade a preencher]",
  foro: process.env.NEXT_PUBLIC_EMPRESA_FORO || "[cidade/UF a preencher]",
};
