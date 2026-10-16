// Canais de contato públicos. O número do WhatsApp vem de NEXT_PUBLIC_WHATSAPP (só dígitos, com DDI),
// ex.: 5562999999999. Sem número, os botões de WhatsApp não aparecem.

export function whatsappConfigurado(): boolean {
  return /^\d{10,15}$/.test(process.env.NEXT_PUBLIC_WHATSAPP ?? "");
}

export function linkWhatsApp(texto = ""): string | null {
  const n = process.env.NEXT_PUBLIC_WHATSAPP ?? "";
  if (!/^\d{10,15}$/.test(n)) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export const CATEGORIAS_CHAMADO = [
  { id: "roteiro", nome: "Roteiro gerado" },
  { id: "pagamento", nome: "Pagamento ou reembolso" },
  { id: "consultoria", nome: "Consultoria pessoal" },
  { id: "agencia", nome: "Agência e planos" },
  { id: "conta", nome: "Conta e dados" },
  { id: "outro", nome: "Outro assunto" },
] as const;

export const STATUS_CHAMADO: Record<string, string> = { aberto: "Aguardando resposta", respondido: "Respondido", fechado: "Encerrado" };
