# Fase 2 · Passagens: estudo de fontes e primeira integração

Pesquisa de 15/10/2026. O acesso direto às páginas oficiais estava bloqueado no ambiente de pesquisa, então os dados vêm de trechos das páginas oficiais em resultados de busca e de repositórios públicos. O que está marcado como **a confirmar** precisa de uma chamada real, que o painel `/admin/estudo` faz.

## O que precisamos

Preço de referência da passagem internacional (com a data da cotação) e um link de compra, de preferência com comissão de afiliado. Não vendemos passagem.

## Fontes avaliadas

| Fonte | Custo por busca | Frescor | Link de compra | Comissão | Situação |
|---|---|---|---|---|---|
| **Travelpayouts (Aviasales Data API)** | US$ 0 | Cache das buscas dos usuários (até 48 h no `prices_for_dates`) | Sim (Aviasales) | ~40% da receita do Aviasales, ≈ 1,1% do bilhete, cookie de 30 dias | **Escolhida como fonte principal** |
| SerpApi (Google Flights) | US$ 0,009 a 0,025, conforme o plano (250 grátis por mês) | Ao vivo (cache de 1 h grátis) | Sim, sem comissão | Nenhuma | Só para conferência interna; o Google processa a SerpApi |
| Duffel | US$ 0,005 por busca excedente + US$ 3 por pedido | Ao vivo | Você vende | Margem própria | Só se o Compass virar agência |
| Amadeus Self-Service | — | — | — | — | Desligado em 17/07/2026 |
| Skyscanner, Kiwi, busca ao vivo da Travelpayouts | — | — | — | — | Exigem 50 mil a 100 mil usuários por mês ou convite |
| Scraping do Google Flights | — | — | — | — | Viola os termos e o robots.txt; descartado |

## Decisão

- **Travelpayouts como fonte principal.** É grátis, aguenta 600 consultas por minuto e paga comissão. Exibimos como "a partir de R$ X por pessoa · cotado em dd/mm", nunca como tarifa garantida.
- **SerpApi como conferência opcional**, só no painel de estudo.
- Toda cotação fica guardada em `cotacoes` com a data e a validade (24 h para voo; resultado vazio vale 6 h) e cada chamada vira uma linha em `eventos_uso` com o custo.

## Como está implementado

- Interface `ProvedorVoos` (`src/lib/viagem/tipos.ts`): qualquer fonte nova só precisa converter a resposta para `OfertaVoo`.
- `travelpayoutsVoos` chama `GET /aviasales/v3/prices_for_dates` com `market=br` e `currency=brl` sempre explícitos (sem `market`, a API devolve o cache do mercado russo).
- Os links do Aviasales viram links de afiliado pela API `POST /links/v1/create` (10 por chamada). Sem `TRAVELPAYOUTS_MARKER` e `TRAVELPAYOUTS_TRS`, o link segue sem comissão.
- Voo open-jaw (entra por um aeroporto e sai por outro) é cotado como dois trechos só de ida. A tela avisa que um bilhete multidestino costuma sair mais barato.
- Os aeroportos vêm do novo campo `resumo_estrategico.aeroportos` que a IA preenche (origem, entrada e saída em IATA). Em roteiros antigos, saem do texto da logística e de uma tabela das principais cidades brasileiras.

## Estudo das 20 rotas

Em `/admin/estudo`, o botão "Rodar 20 rotas" consulta cada rota em três variantes (data exata, mês inteiro e código de cidade, como SAO no lugar de GRU) e grava o resultado em `estudo_rotas`. Com a SerpApi ligada, uma segunda opção também consulta o Google Flights, que serve de referência para o desvio de preço.

Rotas: 8 nacionais (saindo de GYN, BSB e GRU), 1 para Buenos Aires, 7 para a Europa (incluindo BSB→LIS e GYN→LIS) e 4 para Ásia e Oriente Médio, entre dez/2026 e fev/2027.

**Critério:** se a Travelpayouts achar preço em pelo menos 90% das rotas nacionais e da Europa via GRU, com desvio mediano de até ±15% contra o Google, ela fica como fonte principal. Se GYN e BSB falharem muito, o próximo passo é cotar pelo hub (GRU) com o aviso "via São Paulo", ou mostrar "a partir de" pelo mês.

## A confirmar na primeira rodada

1. Se o token da Data API sai automático no painel da Travelpayouts ou é liberado "sob pedido".
2. Se o v3 aceita `market=br` e `currency=brl`.
3. O nome do campo do link gerado na API de links (o código lê `partner_url`).
4. A forma de pagamento da comissão para quem mora no Brasil (PayPal é o mais provável).

## Como ligar

Na Vercel, defina `TRAVELPAYOUTS_TOKEN` (Perfil → API token), `TRAVELPAYOUTS_MARKER` e `TRAVELPAYOUTS_TRS` (ID do projeto). Opcional: `SERPAPI_KEY`. Depois, rode o estudo em `/admin/estudo`.
