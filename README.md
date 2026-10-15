# Compass

Roteiros de viagem **fluidos** gerados por IA: entrada por um aeroporto, saída por outro, nenhuma
volta desnecessária, tempo de cada parada ajustado ao seu ritmo e tudo desenhado num mapa interativo.

## Rodando

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

## Documentação

- [Arquitetura, estrutura de pastas e roadmap](docs/ARCHITECTURE.md)
- System prompt do motor de roteiros: `src/lib/ai/prompts/itinerary-system.ts`
