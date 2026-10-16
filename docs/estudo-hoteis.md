# Fase 3 · Hotéis: estudo de fontes e primeira integração

Pesquisa de 15/10/2026, com as mesmas limitações da de passagens (páginas oficiais lidas por trechos de busca). Objetivo: 2 ou 3 hotéis por cidade do roteiro, com diária de referência, data da cotação e link de reserva.

## O que mudou no mercado

- **O Hotellook acabou** em 20/10/2025, junto com a API de preço de hotéis da Travelpayouts. Hoje a Travelpayouts só gera links de afiliado para hotéis.
- **O programa direto do Booking.com fechou** para afiliados pequenos em 06/2025. O Booking passou para redes (Awin, CJ) e para a Travelpayouts. A Demand API, que dá preço, exige contrato de Managed Affiliate.
- **A Amadeus Self-Service foi desligada** em 17/07/2026, incluindo hotéis.

## Fontes avaliadas

| Fonte | Preço via API? | Link com comissão | Acesso | Situação |
|---|---|---|---|---|
| **SerpApi (Google Hotels)** | Sim, com a diária por loja (inclui Booking.com) | Não | Autosserviço, 250 buscas grátis por mês | **Preço de referência** |
| **Travelpayouts → Booking.com** | Não | Sim, até 4% da reserva (cookie de sessão) | Autosserviço | **Link de reserva** |
| Travelpayouts → Agoda, Trip.com, Hotels.com | Não | Sim (4% a 7%, conforme a fonte) | Autosserviço | Links secundários, depois |
| Agoda Lite API | Sim, com link de afiliado | Sim | Conta de parceiro aprovada | Próxima fase |
| Booking Demand API | Sim | Por contrato | Managed Affiliate | Fora de alcance agora |
| LiteAPI (Nuitée) | Sim | Margem própria (revenda) | Autosserviço | Só se o Compass vender hospedagem |

## Decisão

Preço pela SerpApi (Google Hotels) e link pelo Booking.com via Travelpayouts. Mostramos a diária do próprio Booking quando ela aparece na resposta, porque é a loja do link; senão, a menor diária, com a fonte indicada.

## Como está implementado

- Interface `ProvedorHoteis`, com `serpapiHoteis` como primeira implementação.
- Para cada parada do roteiro, as datas de entrada e saída saem da data de início somada aos dias de cada parada (a última dorme uma noite a menos). No máximo 8 cidades por roteiro, priorizando as com mais noites, para limitar o custo.
- Escolha dos hotéis: dentro da faixa do orçamento (econômico até 3 estrelas, médio de 3 a 4, conforto 4, luxo 5), com nota de pelo menos 4 quando houver opções. Ficam um mais em conta, um intermediário e o mais bem avaliado.
- Sem `SERPAPI_KEY`, cada cidade sai só com o link de busca do Booking nas datas certas.
- Cotação guardada por 72 h (`validade_cotacao_horas`). Custo por busca configurável em `precos_apis` (US$ 0,025 no plano Starter).
- Custo estimado: um roteiro de 5 cidades usa 5 buscas, cerca de US$ 0,13 no Starter. Um roteiro completo de R$ 49,90 cobre isso com folga.

## Mini-estudo

Em `/admin/estudo`, "Rodar hotéis" consulta 5 cidades de perfis diferentes (Lisboa, Ortisei, Krabi, Gramado e San Francisco) e mostra quantos hotéis vieram com diária, quantos com preço do Booking e o tempo de resposta.

## A confirmar

1. Se o `hl=pt-br` é aceito pela SerpApi.
2. Se o Booking.com aparece conectado no projeto da Travelpayouts (há uma pré-aprovação de tráfego).
3. A cláusula dos termos do Booking sobre uso de IA, citada por terceiros.
