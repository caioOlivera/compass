# Compass

Roteiros de viagem **fluidos** gerados por IA: entrada por um aeroporto, saída por outro, nenhuma
volta desnecessária, tempo de cada parada ajustado ao seu ritmo e tudo desenhado num mapa interativo.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha as chaves (Supabase e Anthropic)
npm run dev        # http://localhost:3000
```

## Provedor de IA (dá para começar de graça)

Escolha em `AI_PROVIDER` no `.env.local`. Só a chamada ao modelo muda: as checagens do roteiro
(soma de dias, locais a evitar, coordenadas na sub-região, sem bate-e-volta) valem para todos, e o
roteiro com erro volta para o modelo corrigir.

| Opção | Custo | Para quê |
|---|---|---|
| `demo` | grátis, sem IA | testar o fluxo inteiro; devolve sempre o roteiro de exemplo (Roma → Dolomitas) |
| Ollama / LM Studio no seu computador | grátis | desenvolver com IA de verdade, sem os dados saírem da máquina |
| Gemini, Groq, OpenRouter (planos grátis) | grátis com limite | testar com modelos maiores; confira nos termos se o plano grátis usa seus dados e se permite uso comercial |
| `anthropic` (Claude) | pago | produção |

**Ollama (local)**

1. Instale em https://ollama.com e baixe um modelo: `ollama pull qwen3:14b`
   (máquina mais modesta: `qwen3:8b`; modelos menores erram mais em geografia).
2. No `.env.local`:
   ```
   AI_PROVIDER=openai-compatible
   AI_BASE_URL=http://localhost:11434/v1
   AI_MODEL=qwen3:14b
   ```
   Funciona só rodando o app no seu computador (`npm run dev`): um site publicado não enxerga o
   `localhost` da sua máquina. Gerar pode levar alguns minutos, dependendo do computador.

**Gemini (Google AI Studio)**: crie a chave em https://aistudio.google.com e use
`AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, `AI_API_KEY=<sua chave>` e em
`AI_MODEL` um modelo listado no AI Studio. Modelos recém-lançados ficam sobrecarregados (erro 503)
com frequência: o app repete sozinho e, se você definir `AI_FALLBACK_MODELS` (ex.: um modelo Flash Lite),
passa para o reserva.

**Groq**: chave em https://console.groq.com, `AI_BASE_URL=https://api.groq.com/openai/v1`. Se o modelo
escolhido não aceitar `json_schema`, use `AI_JSON_MODE=json_object`.

**OpenRouter**: chave em https://openrouter.ai, `AI_BASE_URL=https://openrouter.ai/api/v1` e um
modelo com `:free` no nome.

## Fotos (Pexels, grátis)

A landing e as paradas do roteiro usam fotos do [Pexels](https://www.pexels.com). Crie uma chave
gratuita em https://www.pexels.com/api, defina `PEXELS_API_KEY` (na Vercel: Settings → Environment
Variables, depois um Redeploy). As buscas rodam só no servidor e ficam em cache por uma semana; sem
chave, os cartões mostram a cor e o emoji de cada destino. Os créditos dos fotógrafos aparecem no
rodapé e em cada parada.

## Perfil e PDF

- **Perfil** (`/perfil`): nome, telefone e foto. A foto é recortada e reduzida para 512px no navegador e
  vai para o bucket público `avatars` do Supabase Storage, na pasta do usuário (migração
  `20261015000400_perfil_avatar.sql`). O e-mail aparece só para leitura.
- **Exportar PDF**: botão na capa do roteiro. Gerado no servidor com `@react-pdf/renderer`
  (`/api/itineraries/[id]/pdf`, só o dono; `/exemplo/pdf` para o exemplo), com a foto do auge, o desenho
  da rota, o checklist como está marcado e os trechos. A fonte Inter (OFL) fica em `assets/fonts`.

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
