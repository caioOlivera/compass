# Fase 0: diagnóstico e proposta de arquitetura

Data: 15/10/2026. Base: branch `claude/ai-itinerary-generation-system-60bcd4` e projeto Supabase `compass`.

## 1. O que já existe

**Stack.** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind 4, Zod 4, Vitest (111 testes).
Deploy na Vercel. Supabase para Postgres, Auth e Storage. Mapa com MapLibre + OpenFreeMap (sem
custo). Fotos do Unsplash (com Pexels como alternativa). PDF gerado no servidor com `@react-pdf/renderer`.

**IA.** Uma camada de provedores em `src/lib/ai/` permite trocar o motor por variável de ambiente:
Anthropic (Claude), qualquer API no formato OpenAI (hoje: Gemini Flash, grátis) ou modo
demonstração. A resposta é validada por Zod e por regras de negócio (rota sem volta, dias somando o
total, coordenadas dentro da região). Se falhar, o sistema repete a chamada mandando os erros para o
modelo. Também há repetição automática e modelos reserva quando o provedor está sobrecarregado.

**Banco (3 tabelas, todas com RLS).**

| Tabela | Conteúdo |
|---|---|
| `profiles` | nome, telefone, foto (1:1 com o usuário do Auth) |
| `trip_requests` | o questionário: região, datas, flexibilidade, auge, locais desejados e evitados, origem, ritmo, observações, status |
| `generated_itineraries` | o roteiro (JSON validado), checklist marcado, versão, **modelo, tokens de entrada e saída, latência** |

Storage tem um bucket `avatars`. Há limite diário de gerações por usuário (`DAILY_GENERATION_LIMIT`).
As permissões são por linha (RLS) e por coluna: o usuário só lê o que é dele e só altera o título e o
checklist do roteiro.

**Autenticação.** E-mail + senha ou código por e-mail (OTP), via Supabase Auth. O `proxy.ts` protege
as rotas privadas. Não existe papel de administrador.

**Telas.** Landing com fotos, questionário de 7 etapas, lista de roteiros com capa, roteiro no
mapa (paradas, trechos, checklist), perfil com foto e exportação em PDF.

## 2. O que falta para o plano

| Necessidade do plano | Situação hoje |
|---|---|
| Base de conhecimento + busca semântica | Não existe. O pgvector está **disponível** no Supabase, mas não ativado. |
| Painel admin de ingestão e revisão | Não existe; também não há papel de admin. |
| Briefing completo (orçamento, quem viaja, destino específico) | O questionário pede região + auge; faltam orçamento e viajantes. |
| Roteiro **dia a dia** | O formato atual é por parada (dias por cidade + checklist), sem o plano de cada dia. |
| Produtos, créditos, ajustes | Tudo é gratuito, com limite diário. O versionamento (`version`) já serve de base para os ajustes. |
| Custo por geração | Os tokens já são gravados; falta converter em reais e somar as chamadas de voo e hotel. |
| Voos, hotéis, pagamentos, agências (B2B) | Não existem. |

## 3. Pontos de atenção antes de seguir

1. **Roteiros com vários países e continentes.** Hoje a regra é "o roteiro fica dentro de uma região
   e nunca volta pelo mesmo caminho". O seu exemplo (Qatar + Tailândia + Coreia) cruza o Oriente
   Médio e duas regiões da Ásia, com voos entre os países. Proposta: transformar a região única em
   uma lista de destinos e manter a regra "sem bate-e-volta" como preferência, não como bloqueio.
2. **Plano da Vercel.** O plano Hobby (grátis) não permite uso comercial. Para vender, o projeto
   precisa do plano Pro (US$ 20/mês). O Supabase grátis pausa por inatividade e não tem backup;
   o Pro custa US$ 25/mês. Esses dois custos são só sinalização e não fazem parte desta fase.
3. **E-mail de produção.** O envio de e-mails ainda usa o servidor padrão do Supabase, que tem
   limite baixo. Antes de vender, é preciso SMTP próprio (Resend ou Brevo) e um domínio.
4. **Ajustes rápidos que vi nas suas capturas.** A foto de "Monterey e Carmel" veio errada (Carnegie
   Hall), porque a busca usa o nome em português com "e" no meio. Os pins mostram 📍 quando a IA não
   manda emoji. Os dois são pequenos e eu corrijo quando você quiser.

## 4. Proposta de arquitetura

Mantém a base atual (Next.js na Vercel + Supabase). Nada novo pago nesta proposta.

```
                 ┌──────────────── Next.js (Vercel) ────────────────┐
  Cliente B2C ─► │ Briefing ─► Motor de geração ─► Roteiro/Mapa/PDF │ ◄─ Agência B2B (marca)
  Admin (você) ─►│ Painel de ingestão e revisão                      │
                 └──┬───────────────┬──────────────┬─────────────────┘
                    │               │              │
        Provedor de IA     Provedores de dados   Gateway de pagamento
   (Gemini/Claude, trocável)  (voos, hotéis,      (Fase 5)
                    │          fotos; com cache)
                    ▼               ▼
        ┌──────────── Supabase ────────────────────────────────────┐
        │ Auth · Storage (arquivos-fonte, avatares, logos)          │
        │ Postgres + pgvector:                                      │
        │   conhecimento: destinos, atrações, dicas, roteiros base, │
        │                 fontes, trechos com embedding, ingestões  │
        │   consultas: briefings, roteiros (versões), ajustes       │
        │   comercial: produtos, ledger de créditos, assinaturas,   │
        │              organizações (agências) e membros            │
        │   medição: eventos de uso com custo em R$                 │
        │   cache: cotações de voo e hotel com data                 │
        └───────────────────────────────────────────────────────────┘
```

**Módulos no código** (`src/lib/`): `conhecimento/` (ingestão, extração, busca),
`motor/` (briefing → contexto da base → IA → validação), `provedores/` (interface única para voos,
hotéis e fotos), `creditos/` (ledger e regras), `medicao/` (registro de custo). Cada módulo tem
uma interface pequena e testes, como já é feito com a camada de IA.

**Princípios.**
- Todo débito de crédito e todo custo vira uma linha imutável no banco (ledger e eventos de uso), gravada na mesma transação da geração.
- Números de negócio (ajustes inclusos, validade, teto do Premium, preços) ficam numa tabela de configuração, não no código.
- Conteúdo da base só entra em produção depois da sua aprovação no painel. Cada registro guarda a fonte e marca se o conteúdo é próprio ou de terceiro.
- O roteiro gerado guarda quais registros da base foram usados (citações), para auditoria e para o "roteiro assinado".

**Escolhas da Fase 1 que precisam da sua aprovação** (detalhes em `docs/decisoes.md`):
1. **Embeddings:** usar o modelo de embeddings do Gemini (mesma chave, tem cota grátis). Alternativa paga e barata: OpenAI `text-embedding-3-small`.
2. **Extração de texto:** bibliotecas JS no servidor (PDF e DOCX), sem serviço externo. PDFs escaneados (imagem) ficam para depois.
3. **Admin:** só você, definido por e-mail numa variável de ambiente + papel no banco.
4. **Formato do roteiro:** manter as paradas e acrescentar o plano dia a dia dentro de cada parada.
5. **Destinos múltiplos:** trocar a região única por uma lista de destinos (item 3.1).

## 5. O que preciso de você para a Fase 1

- Aprovar (ou ajustar) os 5 itens acima.
- Os arquivos do roteiro Qatar + Tailândia + Coreia (PDF, DOCX ou o que tiver) para o teste de ingestão.
