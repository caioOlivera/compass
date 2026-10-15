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

Migração: `supabase/migrations/20261015000000_initial_schema.sql`.

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

## Contrato da IA

Entrada: o JSON do wizard (campos do PRD) mais `total_dias_viagem`, calculado no servidor a partir
das datas. Saída: `resumo_estrategico` + `pontos_mapa[]`, como no PRD, com dois ajustes:

- `estratégia_deslocamento` vira `estrategia_deslocamento` (chaves sem acento evitam bugs de acesso em JS/SQL).
- Novo campo `resumo_estrategico.alertas: string[]` para o que a IA não conseguiu cumprir
  (local fora da sub-região, desvio grande, ritmo que não cabe nos dias, taxa de devolução do carro).

## Roadmap de commits

1. ~~Estrutura e arquitetura~~
2. ~~Schema do banco: `profiles`, `trip_requests`, `generated_itineraries`, RLS~~
3. Tipos e schemas Zod de entrada, saída e estado do mapa
4. `POST /api/generate-itinerary` com Claude, retry e checagens
5. Mapa interativo (pins, linhas, drawer com checklist)
6. Autenticação (senha + OTP) e `proxy.ts`
7. Wizard de 7 etapas

Depois: base de conhecimento (RAG com posts autorizados do *Como Viajar com Luiz* em pgvector no
próprio Supabase) e módulo de voos (Duffel/Kiwi) usando os hubs de entrada e saída do roteiro.
