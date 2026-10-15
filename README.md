# Compass

Roteiros de viagem **fluidos** gerados por IA: entrada por um aeroporto, saída por outro, nenhuma
volta desnecessária, tempo de cada parada ajustado ao seu ritmo e tudo desenhado num mapa interativo.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha as chaves (Supabase e Anthropic)
npm run dev        # http://localhost:3000
```

## Banco de dados

O projeto Supabase `compass` já tem as migrações de `supabase/migrations/` aplicadas. Para um projeto
novo, aplique-as pelo SQL Editor ou com `npx supabase db push`.

Configuração de Auth no painel do Supabase (não dá para versionar no repositório):

1. **Authentication → URL Configuration**: *Site URL* = domínio de produção; em *Redirect URLs*
   inclua `http://localhost:3000/auth/callback` e `https://SEU-DOMINIO/auth/callback`.
2. **Authentication → Email Templates**: nos templates *Confirm signup* e *Magic Link*, inclua o
   código para quem prefere digitar em vez de clicar no link, por exemplo:
   `<p>Seu código: <strong>{{ .Token }}</strong></p>`
3. **Authentication → Providers → Email**: "Confirm email" ligado.
4. Para produção, configure um SMTP próprio (*Authentication → Emails → SMTP*): o envio padrão do
   Supabase tem limite baixo de e-mails por hora.

## Documentação

- [Arquitetura, estrutura de pastas e roadmap](docs/ARCHITECTURE.md)
- System prompt do motor de roteiros: `src/lib/ai/prompts/itinerary-system.ts`
