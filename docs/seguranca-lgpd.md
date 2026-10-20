# Segurança da informação e LGPD

Programa mínimo de conformidade da Compass. Atualizar quando surgir um dado, um fornecedor ou uma finalidade nova.
Validar com advogado antes de vender em escala.

## 1. Papéis

- **Controlador:** a empresa dona da Compass. Razão social, CNPJ e endereço vêm de `NEXT_PUBLIC_EMPRESA_*`.
- **Encarregado (DPO):** canal `NEXT_PUBLIC_EMAIL_PRIVACIDADE`. Como agente de pequeno porte (Res. CD/ANPD nº 2/2022), a indicação de encarregado é dispensada, mas o canal de contato é obrigatório e está publicado.
- **Operadores:** os fornecedores da tabela 3.

## 2. Registro das operações de tratamento (art. 37)

| Dado | Titular | Finalidade | Base legal (art. 7º) | Guarda |
| --- | --- | --- | --- | --- |
| Nome, e-mail, telefone, foto | Cliente | Conta e contato | Execução de contrato (V) | Até excluir a conta |
| Respostas do questionário, roteiros | Cliente | Gerar e ajustar roteiros | Execução de contrato (V) | Até excluir a conta |
| Pedidos, valores, id do pagamento | Cliente | Cobrança, reembolso, fiscal | Contrato (V) e obrigação legal (II) | 5 anos (anonimizado após exclusão) |
| Créditos | Cliente | Saldo e uso | Execução de contrato (V) | Até excluir a conta |
| Chamados e briefing de consultoria | Cliente | Suporte e consultoria | Execução de contrato (V) | 2 anos após fechar |
| Registros de uso (custo, IP de acesso do provedor) | Cliente | Segurança, fraude, Marco Civil | Legítimo interesse (IX) e obrigação legal (II) | 6 meses |
| Cookies de afiliado | Visitante | Comissão de parceiros | Consentimento (I) | Até retirar o aceite |
| Hash do e-mail de conta excluída | Ex-cliente | Evitar repetir o roteiro grátis | Legítimo interesse (IX) | Indefinido (não identifica sem o e-mail) |

Dados sensíveis (art. 11) não são pedidos. Se a pessoa escrever algo de saúde ou religião no campo livre, o dado é tratado só para montar o roteiro.

## 3. Operadores e transferência internacional (art. 33)

| Operador | Uso | País |
| --- | --- | --- |
| Supabase | Banco, autenticação, arquivos | EUA (us-east-1) |
| Vercel | Hospedagem e agendamentos | EUA |
| Google (Gemini) | IA que gera os roteiros | EUA |
| Mercado Pago | Pagamentos | Brasil |
| Resend | E-mails de suporte (opcional) | EUA |
| Travelpayouts | Preços de passagens e links de afiliado | Holanda |
| SerpApi | Preços de hotéis e voos | EUA |
| Unsplash / Pexels | Fotos (sem dado pessoal) | EUA / Alemanha |
| OpenFreeMap | Mapa (sem dado pessoal) | UE |

A transferência se apoia nas cláusulas contratuais dos fornecedores e é informada na Política. Para a IA, o que vai é só o questionário da viagem, sem nome nem e-mail.

## 4. Direitos do titular (art. 18)

- **Acesso e portabilidade:** perfil → "Baixar meus dados" (`/api/meus-dados`, JSON).
- **Correção:** perfil (nome, telefone, foto).
- **Eliminação:** perfil → "Excluir minha conta". Fluxo em `src/lib/lgpd.ts` (`excluirConta`): arquiva pedidos pagos sem identificação, grava o hash do e-mail, apaga as fotos e exclui o usuário (o resto sai em cascata). Dono de agência com plano ativo precisa cancelar antes.
- **Outros pedidos** (informação sobre compartilhamento, revogação, oposição, revisão de decisão automatizada): pelo e-mail de privacidade. Prazo de resposta: 15 dias. Registrar o pedido e a resposta num chamado.

## 5. Guarda e descarte

`limparPrazosVencidos` (em `src/lib/lgpd.ts`) roda no fim do cron diário (`/api/cron/cotacoes`):

- cotações > 30 dias;
- webhooks recebidos > 90 dias;
- `eventos_uso` > 6 meses;
- chamados fechados há mais de 2 anos;
- `pedidos_arquivados` com `apagar_apos` vencido.

## 6. Controles de segurança

- HTTPS sempre (HSTS), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, CSP mínima aplicada e completa em Report-Only (`next.config.ts`).
- RLS em todas as tabelas; tabelas internas sem política (só o servidor). Funções `security definer` com `search_path` fixo e `execute` só para quem precisa.
- Chave de serviço, tokens de pagamento e de provedores só em variáveis de ambiente do servidor. Nada de chave no repositório (o repositório é público).
- Webhook do Mercado Pago validado por assinatura HMAC; cron protegido por `CRON_SECRET`.
- Admin restrito à tabela `admins`, checado no servidor (`exigirAdmin`).
- Limite de uso por hora para quem gera sem crédito.
- **Pendentes no painel:** ligar a proteção contra senhas vazadas (Supabase → Auth → Passwords), apagar a função `teste_x`, ativar MFA nas contas de admin do Supabase, Vercel, Mercado Pago e GitHub.

## 7. Incidentes (art. 48 e Res. CD/ANPD nº 15/2024)

1. **Conter:** trocar as chaves expostas (Supabase, Mercado Pago, provedores), revogar sessões, tirar do ar o que vaza.
2. **Avaliar:** quais dados, quantos titulares, risco ou dano relevante.
3. **Comunicar:** se houver risco ou dano relevante, avisar a ANPD (formulário no site) e os titulares em até 3 dias úteis do conhecimento. Agente de pequeno porte tem prazo em dobro.
4. **Registrar:** guardar o registro do incidente por 5 anos, mesmo sem comunicação.
5. **Corrigir** a causa e anotar aqui o que mudou.

## 8. Revisão

Revisar este documento e a Política a cada fornecedor novo, dado novo ou finalidade nova, e ao menos 1 vez por ano. Ao mudar a Política, subir `VERSAO_TERMOS` em `src/lib/empresa.ts`.
