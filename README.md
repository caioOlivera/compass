# Compass

Roteiros de viagem **fluidos** gerados por IA: entrada por um aeroporto, saída por outro, nenhuma
volta desnecessária, tempo de cada parada ajustado ao seu ritmo e tudo desenhado num mapa interativo.

## Rodando

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

## Banco de dados

Crie um projeto no [Supabase](https://supabase.com) e aplique a migração de `supabase/migrations/`
(pelo SQL Editor do painel ou com `npx supabase db push`). Em *Authentication → Providers → Email*,
deixe ligados "Confirm email" e o envio de OTP.

## Documentação

- [Arquitetura, estrutura de pastas e roadmap](docs/ARCHITECTURE.md)
- System prompt do motor de roteiros: `src/lib/ai/prompts/itinerary-system.ts`
