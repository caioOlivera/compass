# Decisões

Registro das decisões importantes: o que foi decidido, as alternativas e o motivo. As mais novas ficam no topo.
Status: **decidida**, **proposta** (espera aprovação) ou **revista**.

---

## 2026-10-15 · Embeddings da base de conhecimento (proposta)
- **Proposta:** modelo de embeddings do Gemini, vetores no pgvector do Supabase.
- **Alternativas:** OpenAI `text-embedding-3-small` (pago, barato, muito usado); Voyage (pago); modelo local (exige servidor próprio).
- **Motivo:** mesma chave que já está em uso, cota grátis e sem serviço novo. Como a chamada fica atrás de uma interface, dá para trocar depois. Trocar de modelo exige recalcular todos os vetores, o que é barato com a base pequena.

## 2026-10-15 · Destinos múltiplos em vez de região única (proposta)
- **Proposta:** o briefing passa a aceitar uma lista de destinos (países ou cidades), e "sem bate-e-volta" vira preferência em vez de regra que bloqueia.
- **Alternativas:** manter a região única (impede roteiros como Qatar + Tailândia + Coreia); permitir várias regiões sem mudar a validação (a IA seria barrada pelas regras atuais).
- **Motivo:** os roteiros reais da consultoria cruzam regiões.

## 2026-10-15 · Roteiro por parada com plano dia a dia (proposta)
- **Proposta:** manter a estrutura atual por parada (mapa, trechos, checklist) e acrescentar `dias[]` dentro de cada parada.
- **Alternativa:** trocar tudo por uma lista de dias (perde o mapa por base e o checklist já em uso).
- **Motivo:** aproveita o que já funciona e entrega o dia a dia que o plano pede.

## 2026-10-15 · Fotos pelo Unsplash (decidida)
- **Decisão:** `UNSPLASH_ACCESS_KEY` como banco principal; o Pexels continua suportado.
- **Alternativas:** Pexels (emissão de chaves pausada), Pixabay, Wikimedia Commons.
- **Motivo:** chave grátis na hora e boas fotos de viagem. Busca só no servidor, com cache de uma semana. O crédito ao fotógrafo aparece no site e no PDF.

## 2026-10-15 · PDF gerado no servidor com @react-pdf/renderer (decidida)
- **Alternativas:** imprimir a página pelo navegador ("Salvar como PDF"); Chrome headless no servidor (pesado na Vercel).
- **Motivo:** download direto, layout controlado e leve. A fonte Inter vai embutida. Limitação: sem emojis e sem alfabetos não latinos por enquanto.

## 2026-10-15 · IA trocável por variável de ambiente (decidida)
- **Decisão:** camada de provedores com Anthropic, formato OpenAI (Gemini, Groq, OpenRouter, Ollama) e demonstração. Hoje roda com Gemini Flash.
- **Motivo:** começar sem custo e medir qualidade e custo antes de escolher o motor pago. A escolha final depende da medição da Fase 6.

## 2026-10-15 · Mapa com MapLibre + OpenFreeMap (decidida)
- **Alternativas:** Mapbox, Google Maps (pagos acima da cota, exigem chave).
- **Motivo:** sem custo e sem chave. Trocar por Mapbox depois é só trocar o estilo.

## 2026-10-15 · Next.js na Vercel + Supabase (decidida)
- **Motivo:** já são as ferramentas que você usa. O Supabase entrega Postgres, pgvector, Auth e Storage num lugar só, com RLS.
- **Atenção:** para vender, a Vercel precisa do plano Pro (o Hobby proíbe uso comercial), e o Supabase grátis pausa por inatividade. Os dois upgrades são pagos e esperam sua decisão.
