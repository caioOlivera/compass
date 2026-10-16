# Decisões

Registro das decisões importantes: o que foi decidido, as alternativas e o motivo. As mais novas ficam no topo.
Status: **decidida**, **proposta** (espera aprovação) ou **revista**.

---

## 2026-10-16 · Passagens pela Travelpayouts, hotéis pela SerpApi + Booking (decidida)
- **Decisão:** preço de referência das passagens pela Aviasales Data API (Travelpayouts), com link de afiliado; diárias pela SerpApi (Google Hotels) e reserva pelo Booking.com via links da Travelpayouts.
- **Alternativas:** Amadeus (desligado em 07/2026), Skyscanner e Kiwi (exigem muito tráfego ou convite), Duffel (só para quem vende), Hotellook (encerrado em 10/2025), Booking Demand API (exige contrato).
- **Motivo:** são as únicas fontes abertas para uma empresa pequena; a de passagens é grátis e paga comissão. Preço sempre como referência, com a data da cotação. Detalhes em `docs/estudo-voos.md` e `docs/estudo-hoteis.md`.
- **Pendente:** rodar o estudo das 20 rotas em /admin/estudo depois de configurar as chaves, e confirmar os itens marcados nos dois estudos.

## 2026-10-16 · Pagamentos pelo Mercado Pago (decidida)
- **Decisão:** Checkout Pro do Mercado Pago para compras avulsas (Pix e cartão na mesma tela) e assinatura mensal (preapproval) para os planos das agências.
- **Alternativas:** Stripe (Pix só por convite no Brasil, cartão cai em 30 dias, +0,7% no Billing); Asaas (Pix com tarifa fixa de R$ 1,99, que come 20% de um roteiro de R$ 9,90); Pagar.me (tarifa fixa de R$ 0,99 e sem fonte oficial atual de preços). Comparativo completo no relatório de pesquisa de pagamentos.
- **Motivo:** Pix e cartão sem montar tela de pagamento, assinatura pronta, conhecido pelo público. A taxa sai por venda, sem mensalidade.
- **Como funciona:** o pedido nasce no banco, o cliente paga no Mercado Pago e o aviso (webhook com assinatura HMAC conferida) libera o crédito. Nunca confiamos no corpo do aviso: o servidor busca o pagamento na API e confere valor e pedido. Repetir o aviso não muda nada. Na volta do checkout a página do pedido também confere, para não depender só do aviso.
- **Interruptor:** `cobranca_ativa` em /admin/config. Desligado (padrão), gerar segue grátis com limite diário; ligado, cada consulta consome 1 crédito.

## 2026-10-16 · Créditos em livro-razão com validade (decidida)
- **Decisão:** tabela `creditos` só recebe inserções. Compra vira lote (+N, com validade); uso aponta o lote (−1). Saldo = soma por lote (`creditos_lotes`). O consumo trava os lotes e usa o que vence primeiro, da agência antes do pessoal.
- **Regras:** B2C vale 12 meses; Basic recebe 30 créditos "completo" por mês, válidos até o fim do período (não acumulam); Premium não usa créditos, só uso justo (limite por hora e alerta no log acima de 150/mês). Crédito "completo" serve para roteiro e assinado também. Geração que falha devolve o crédito. O 4º ajuste consome um crédito do mesmo tipo e libera mais 3.
- **Reembolso:** em até 7 dias (configurável) e só se o crédito não foi usado, feito pelo admin em /admin/pedidos. **Validar o texto e o prazo com um advogado** (o CDC dá 7 dias de arrependimento em compra on-line).

## 2026-10-16 · Agências: uma por pessoa, dono gerencia (decidida)
- **Decisão:** cada pessoa pertence a no máximo uma agência; o dono edita marca, logo e equipe. Remover membro é feito pelo servidor depois de conferir que quem pede é o dono.
- **Motivo:** simples e cobre o caso real (equipe pequena). Várias agências por pessoa pode vir depois, se pedirem.

## 2026-10-16 · Repositório público e dados da base fora dele (decidida)
- **Decisão:** relatos, extrações e dados da base de conhecimento ficam só no Supabase, nunca no Git.
- **Motivo:** o repositório está público. Recomendo deixá-lo privado (Settings > General > Danger Zone no GitHub); a Vercel continua funcionando.

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
