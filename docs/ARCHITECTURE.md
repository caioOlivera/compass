# Arquitetura do Compass

SaaS que transforma um questionário de viagem em um roteiro **fluido** (open-jaw, sem bate-e-volta)
mostrado num mapa interativo com checklists por parada e detalhes de cada trecho.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript estrito | Front e API no mesmo deploy (Vercel). |
| Estilo | Tailwind 4 + componentes próprios em `components/ui` (padrão shadcn) | Tokens de cor em `globals.css`, modo escuro automático. |
| Dados no cliente | TanStack Query | Cache e estados de carregamento da geração e da lista de roteiros. |
| Auth + banco | Supabase (Postgres + Auth + RLS) | E-mail/senha e OTP por e-mail prontos; RLS isola os dados de cada usuário. |
| IA | Claude via `@anthropic-ai/sdk`, saída com structured output validada por Zod | Resposta sempre no schema; nada de "limpar" JSON na mão. |
| Mapa | MapLibre GL via `react-map-gl` | Mesma API do Mapbox, sem token; estilo gratuito do OpenFreeMap. Trocar por Mapbox = trocar o import e o estilo. |
| Validação | Zod 4 | Um schema só valida o wizard no cliente, o body da API e a resposta da IA. |

## Fluxo

```
Landing ─► Cadastro/Login (senha ou OTP) ─► Wizard (7 etapas)
                                               │ POST /api/generate-itinerary
                                               ▼
                       Zod(input) ─► trip_requests (status: generating)
                                               │
                                               ▼
                       Claude + ITINERARY_SYSTEM_PROMPT + schema de saída
                                               │
                                               ▼
                       Zod(output) + checagens de negócio ─► generated_itineraries
                                               │
                                               ▼
                       /roteiros/[id] ─► Mapa: pins, polylines, drawer com checklist
```

### Provedores (`src/lib/ai/`)

`AI_PROVIDER` escolhe o motor em `lib/ai/index.ts`:

| Valor | Arquivo | Como chama |
|---|---|---|
| `anthropic` | `providers/anthropic.ts` | SDK oficial, structured output, streaming, fallback de recusa |
| `openai-compatible` | `providers/openai-compatible.ts` | `fetch` em `{AI_BASE_URL}/chat/completions` (Ollama, LM Studio, Gemini, Groq, OpenRouter, Mistral) com `response_format` conforme `AI_JSON_MODE`; o schema também vai no prompt |
| `demo` | `providers/demo.ts` | sem IA: roteiro de exemplo com os dias redistribuídos e aviso de demonstração |

`generate.ts` é independente do provedor: recebe um `ChamadorModelo` (mensagem → texto + motivo
de parada + tokens), valida e refaz. `extrairJson` tolera bloco de código e `<think>` de modelos locais.
O schema (`schema.ts`) vai sem `$ref`, porque alguns provedores não aceitam referências.

### Geração (`src/lib/ai/generate.ts`)

- Modelo `ANTHROPIC_MODEL` (padrão `claude-opus-5-5`), esforço `ANTHROPIC_EFFORT` (padrão `medium`), streaming
  para não esbarrar em timeout HTTP, `max_tokens` 32 000.
- Structured output com o JSON Schema gerado de `ItinerarySchema`. A validação Zod é feita por nós
  (não pelo `parse()` do SDK) para que os erros voltem ao modelo.
- Fallback do lado do servidor (`fallbacks: "default"`): se o modelo recusar por engano, a própria API
  refaz no modelo alternativo.
- Até 2 tentativas. A segunda recebe o JSON anterior e a lista exata de erros.
- `stop_reason: "refusal"` encerra sem nova tentativa; `max_tokens` pede concisão na segunda.
- Teto de gasto mensal da Anthropic atingido (429 `enforced_spend_limit_reached`) é registrado como
  alerta e mostrado como indisponibilidade, separado do rate limit comum.

### Rota (`POST /api/generate-itinerary`)

1. Sessão do Supabase obrigatória (401).
2. Zod no body, data de saída não pode ter passado (400 com erros por campo).
3. Limite diário `DAILY_GENERATION_LIMIT` via `generations_last_24h` (429).
4. Cria `trip_requests` com a sessão do usuário (RLS) → `generating`.
5. Gera, grava `generated_itineraries` com service_role → `completed` → 201 `{ trip_request_id, itinerary_id }`.
6. Falha → `failed` + `error_message`; 502 (IA inconsistente/recusa), 503 (sobrecarga/conexão), 499 (cancelado).

Checagens de negócio feitas no servidor depois da IA (o modelo pode errar, o código não deixa passar):
soma de `dias_alocados` = total de dias, nenhum ponto em `locais_a_evitar`, `proximo_deslocamento`
null só no último ponto e apontando para o próximo `id_ponto`, coordenadas dentro da sub-região.
Falhou → uma nova tentativa com o erro no prompt; falhou de novo → erro para o usuário.

## Estrutura de pastas

```
compass/
├── docs/ARCHITECTURE.md            ← este arquivo
├── supabase/migrations/            ← SQL versionado
└── src/
    ├── proxy.ts                    ← renova a sessão do Supabase e protege (app) (passo 6)
    ├── app/
    │   ├── (marketing)/page.tsx    ← landing page "/"
    │   ├── (auth)/
    │   │   ├── login/              ← e-mail + senha ou "receber código"
    │   │   ├── cadastro/           ← nome, e-mail, telefone, senha
    │   │   └── verificar/          ← digitar o OTP de 6 dígitos
    │   ├── auth/callback/route.ts  ← troca o código do link mágico por sessão
    │   ├── (app)/                  ← área logada (layout com header e checagem de sessão)
    │   │   ├── nova-viagem/        ← wizard
    │   │   └── roteiros/
    │   │       ├── page.tsx        ← roteiros salvos
    │   │       └── [id]/page.tsx   ← mapa interativo
    │   └── api/
    │       ├── generate-itinerary/route.ts
    │       └── itineraries/[id]/route.ts   ← ler roteiro, salvar checklist marcado
    ├── components/
    │   ├── ui/                     ← botões, inputs, slider, drawer, card
    │   ├── landing/
    │   ├── auth/
    │   ├── wizard/
    │   │   ├── wizard.tsx          ← estado, navegação e validação por etapa
    │   │   └── steps/              ← regiao, datas, auge, locais, origem, ritmo, observacoes
    │   ├── map/
    │   │   ├── itinerary-map.tsx   ← mapa, fitBounds na rota
    │   │   ├── route-pins.tsx      ← pins coloridos por tipo_ponto
    │   │   ├── route-lines.tsx     ← polylines + tooltip do trecho
    │   │   └── point-drawer.tsx    ← dias, subtítulo, checklist
    │   └── itinerary/              ← resumo estratégico, lista lateral de paradas
    ├── hooks/                      ← useGenerateItinerary, useItinerary, useChecklist
    ├── lib/
    │   ├── constants.ts            ← sub-regiões, ritmos, tipos de ponto
    │   ├── wizard.ts               ← etapas do questionário e validação por etapa
    │   ├── ai/
    │   │   ├── client.ts           ← SDK da Anthropic (server-only)
    │   │   ├── generate.ts         ← chamada, retry e checagens de negócio
    │   │   └── prompts/itinerary-system.ts
    │   ├── supabase/               ← client.ts (browser), server.ts, admin.ts
    │   ├── validation/             ← schemas Zod de entrada e saída
    │   └── geo/                    ← bounds, distância, checagem de sub-região
    └── types/                      ← tipos inferidos dos schemas + estado do mapa
```

Regras de organização:
- Tudo que fala com a IA ou usa a service role fica em arquivos com `import "server-only"`.
- Tipos de domínio são inferidos dos schemas Zod (`z.infer`), nunca escritos à mão em paralelo.
- Componentes de mapa são client components carregados só na rota do roteiro (o MapLibre pesa ~200 kB).

## Modelo de dados

Migrações em `supabase/migrations/`, já aplicadas no projeto Supabase `compass`.

| Tabela | O que guarda | Usuário (RLS) | Servidor (service_role) |
|---|---|---|---|
| `auth.users` | e-mail, senha, OTP (Supabase Auth) | — | — |
| `profiles` | nome e telefone do cadastro; criado por trigger a partir de `options.data` do signUp | lê e edita `full_name`, `phone` | — |
| `trip_requests` | respostas do wizard, `total_days` calculado, `status` (`pending` → `generating` → `completed`/`failed`) | cria (sem poder definir `status`), lê, apaga | muda `status` e `error_message` |
| `generated_itineraries` | JSON da IA (`itinerary`), `version` por regeneração, `checklist_state`, tokens e latência | lê, edita `title` e `checklist_state` | grava |

- `checklist_state` = `{ "<id_ponto>": [índices marcados] }`, ex.: `{ "p1": [0, 2] }`. Cada regeneração
  é uma nova versão com checklist zerado, então os índices nunca apontam para uma lista diferente.
- Um trigger garante que o `user_id` do roteiro é o mesmo do pedido, mesmo quando o servidor grava
  com service_role (que ignora RLS).
- `generations_last_24h(user_id)` conta gerações do dia para o limite por plano; só o servidor executa.
- Apagar a conta em `auth.users` apaga perfil, pedidos e roteiros em cascata.

## Questionário (`/nova-viagem`)

`components/wizard/wizard.tsx` + `steps.tsx`, etapas e validação em `lib/wizard.ts`.

- 7 etapas do PRD; cada uma valida só os próprios campos (`validarEtapa`) antes de avançar.
- As regras entre campos (`checarDatas`, `checarLocais`) ficam fora do `superRefine` para rodarem na
  etapa certa: no Zod, o `superRefine` só executa com o objeto inteiro válido.
- Rascunho no `localStorage` (recarregar não perde as respostas); apagado quando o roteiro é gerado.
- Envio: `POST /api/generate-itinerary` → tela de espera → `/roteiros/[id]`. Erro 400 volta para a
  etapa do campo com problema; 401 vai para o login; demais erros mostram a mensagem e "Tentar de novo".

## Autenticação

| Tela | Como funciona |
|---|---|
| `/cadastro` | nome, e-mail, telefone, senha → `signUp` com `full_name`/`phone` nos metadados (o trigger cria o profile) → `/verificar` |
| `/login` | aba "Com senha" (`signInWithPassword`) ou "Código por e-mail" (`signInWithOtp`, sem criar conta) |
| `/verificar` | código de 6 dígitos → `verifyOtp({ type: "email" })`, vale para cadastro e login; reenvio após 60 s |
| `/auth/callback` | destino dos links dos e-mails (`?code=` PKCE ou `?token_hash=`) |
| `src/proxy.ts` | renova a sessão a cada navegação; sem sessão em `/roteiros` e `/nova-viagem` → `/login?next=`; logado em `/login` → `/roteiros` |

- `next` só aceita caminho interno (`caminhoSeguro`), contra open redirect.
- Erros do Supabase Auth traduzidos por código em `mensagemErroAuth`.
- A proteção dos dados é a RLS; o proxy só decide navegação.

## Mapa interativo

Tela `/roteiros/[id]` (e `/exemplo`, demonstração pública com o roteiro do PRD).

| Peça | Arquivo |
|---|---|
| Composição, seleção, layout desktop/celular | `components/itinerary/itinerary-view.tsx` |
| Mapa (MapLibre via react-map-gl): pins por tipo, linhas por transporte, popup do trecho | `components/map/itinerary-map.tsx` |
| Painel da parada: dias, checklist, próximo trecho, navegação | `components/map/point-drawer.tsx` |
| Lista lateral: resumo, alertas, progresso, rota | `components/itinerary/route-sidebar.tsx` |
| Checklist otimista com PATCH agrupado | `hooks/use-checklist.ts` → `PATCH /api/itineraries/[id]` |

- Linhas: voo tracejado, barco pontilhado, terrestre contínuo; cor por meio de transporte
  (`tipoTransporte` classifica o texto livre da IA). São retas entre as bases, não o traçado da estrada.
- O MapLibre 6 roda num worker carregado de arquivo separado; `scripts/copy-maplibre-worker.mjs`
  (postinstall) copia o worker para `public/` e o mapa aponta para ele com `setWorkerUrl`.
- Estilo do mapa: `NEXT_PUBLIC_MAP_STYLE_URL`, padrão OpenFreeMap Positron (sem token).
- Componentes de UI no padrão shadcn (Radix + Tailwind) em `components/ui`; animações com Motion,
  respeitando `prefers-reduced-motion`.

## Contrato da IA

Fonte da verdade: `src/lib/validation/` (Zod). Os tipos de domínio saem de `z.infer`.

| Arquivo | O que define |
|---|---|
| `trip-request.ts` | `TripRequestInputSchema`: respostas do wizard com as chaves do PRD (validadas no cliente e na API); mapeamento para as colunas de `trip_requests`; `toPromptInput` acrescenta `total_dias_viagem` |
| `itinerary.ts` | `ItinerarySchema`: saída da IA, enviada ao Claude como structured output; `ChecklistStateSchema` |
| `../itinerary/rules.ts` | regras que o schema não expressa (soma de dias, ids e ordem, deslocamentos encadeados, hubs nas pontas, local repetido, local a evitar, coordenada fora da sub-região) |
| `../itinerary/map.ts` | estado da tela do mapa: trechos, limites para `fitBounds`, seleção, checklist |
| `../../types/database.ts` | tipos das tabelas, gerados pelo Supabase |

Ajustes em relação ao JSON do PRD:

- `estratégia_deslocamento` → `estrategia_deslocamento` (chaves sem acento evitam bugs em JS/SQL).
- `resumo_estrategico.alertas: string[]`: o que a IA não conseguiu cumprir (local fora da
  sub-região, desvio grande, ritmo que não cabe nos dias, taxa de devolução do carro).
- `titulo`: nome curto da viagem, usado na lista de roteiros.
- Categorias do checklist fechadas em 10 opções (`CATEGORIAS_CHECKLIST`) para dar cor e filtro na UI.

## Roadmap de commits

1. ~~Estrutura e arquitetura~~
2. ~~Schema do banco: `profiles`, `trip_requests`, `generated_itineraries`, RLS~~
3. ~~Tipos e schemas Zod de entrada, saída e estado do mapa~~
4. ~~`POST /api/generate-itinerary` com Claude, retry e checagens~~
5. ~~Mapa interativo (pins, linhas, drawer com checklist)~~
6. ~~Autenticação (senha + OTP) e `proxy.ts`~~
7. ~~Wizard de 7 etapas~~

Depois: base de conhecimento (RAG com posts autorizados do *Como Viajar com Luiz* em pgvector no
próprio Supabase) e módulo de voos (Duffel/Kiwi) usando os hubs de entrada e saída do roteiro.
