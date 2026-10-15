# Fase 1: proposta do modelo de dados da base de conhecimento

Status: **proposta, aguardando aprovação**. Nada foi criado no banco.

## 1. O que o material mostra

O zip tem 59 relatos da comunidade: 58 em texto (~440 KB, cerca de 120 mil tokens) e 1 PDF de 26
páginas (Indonésia). Cobrem dezenas de países. Lendo uma amostra, o conteúdo útil para o gerador se
repete em seis tipos de informação:

| Tipo | Exemplo real dos relatos |
|---|---|
| **Lugar** (atração, passeio, restaurante, hotel, bar, compras) | "Tom Yam Restaurant, Phi Phi: Pad See Ew por ~R$ 12" · "Tiger Cave Temple, Krabi: 1.260 degraus, ~1 h de subida" |
| **Trecho** (como ir de A a B) | "Chiang Mai → Sukhothai: táxi, 4 h, ~R$ 620 o casal; ônibus leva ~12 h" · "Phi Phi → Phuket: lancha rápida" |
| **Dica** | "Nas Dolomitas, some 60–70% ao tempo do Maps: as estradas são sinuosas" · "Em Bangkok, o transporte público pelo Google Maps é barato e fácil" |
| **Operador / serviço** | "Phi Phi Brazuca: passeios com guias brasileiros" · "Experiência Tailândia: bate-volta com guia que fala português" |
| **Preço de referência** | Sempre datado pela viagem (jan/2023, jul/2023…), em reais, euros ou dólares |
| **Roteiro** | Sequência de dias com cidades-base e deslocamentos |

**Cuidados que o material exige:**
- **Dados pessoais.** Há 13 perfis de Instagram citados, nomes de membros e 2 arquivos com telefone. A extração **descarta** nomes, perfis e telefones de pessoas (LGPD). Só ficam nomes de estabelecimentos e operadores.
- **Conteúdo de terceiros.** Cada relato vira um registro de **fonte** marcado como "terceiro". O que entra na base são **fatos resumidos** (lugar, preço, tempo, dica), nunca o texto do relato. O texto original fica guardado de forma privada, só para você consultar na revisão.
- **Preços envelhecem.** Todo preço guarda valor, moeda e **mês/ano de referência**. O gerador mostra "referência de 2023" e corrige pela idade quando precisar.
- **Opinião conta.** Os relatos dizem "não recomendo" e "melhor passeio da viagem". Cada lugar guarda um **veredito** (recomendado / neutro / evitar) e quantas fontes o citam.
- **Repetição.** O mesmo restaurante ou passeio aparece em vários relatos. A ingestão procura o registro existente e propõe **mesclar**, em vez de duplicar.

## 2. Tabelas propostas

```
fontes ──< fonte_citacoes >── (destinos | lugares | trechos | dicas | roteiros_base)
destinos (hierarquia país > região > cidade)
  ├─< lugares            (atração, passeio, restaurante, hotel, bar, compras, operador)
  ├─< dicas
  ├─< eventos            (festivais e datas sazonais)
  └─< trechos (origem → destino)
roteiros_base ──< roteiro_base_dias
ingestoes ──< ingestao_itens   (fila de revisão: rascunhos que você aprova, edita ou rejeita)
conhecimento_busca             (textos com embedding, só de registros aprovados)
```

| Tabela | Campos principais |
|---|---|
| `fontes` | tipo (`relato_comunidade`, `roteiro_proprio`, `anotacao_propria`, `consultoria`), autoria (`propria`/`terceiro`), título, arquivo no Storage privado, mês/ano da viagem, texto extraído (privado), hash (evita subir o mesmo arquivo duas vezes) |
| `destinos` | nome, tipo (`pais`/`regiao`/`cidade`), pai, código do país, coordenadas, moeda, idioma, visto para brasileiro (com data da verificação), meses bons e meses a evitar, clima por mês, custo diário (econômico/médio/conforto, em R$, com ano) |
| `lugares` | destino, nome, tipo, tags (cultura, natureza, gastronomia, vida noturna, crianças…), tempo de visita, custo (valor + moeda + mês/ano), reservar com antecedência, melhor horário, coordenadas, veredito, nº de menções, resumo |
| `trechos` | origem, destino, meio (voo, trem, ferry, ônibus, carro, táxi), duração, custo de referência, operador, observação |
| `dicas` | destino ou lugar, categoria (transporte, dinheiro, golpes, segurança, clima, documentação, economia/milhas, logística), texto, ano de referência |
| `eventos` | destino, nome, regra da data (ex.: "lua cheia do 12º mês lunar", que é o Yi Peng), meses possíveis |
| `roteiros_base` | título, **assinado** (sim/não), autoria, fonte, duração, época ideal, resumo, essência (o que não pode mudar ao adaptar) |
| `roteiro_base_dias` | nº do dia, cidade do dia, cidade do pernoite, atividades (ligadas a `lugares` quando possível), deslocamento do dia (ligado a `trechos`), observação |
| `fonte_citacoes` | qual fonte sustenta qual registro, com um trecho curto (até ~200 caracteres) para você conferir |
| `ingestoes` / `ingestao_itens` | arquivo enviado, status, custo da extração em tokens; cada item proposto com ação (`criar`, `mesclar com X`), dados em JSON e decisão (`pendente`, `aprovado`, `editado`, `rejeitado`) |
| `conhecimento_busca` | tipo e id do registro, destino, texto curto, embedding (pgvector) |

Todo registro tem **status** (`rascunho`/`aprovado`/`arquivado`). O gerador só lê `aprovado`.
Só o admin acessa a base; o cliente nunca lê as tabelas diretamente.

## 3. Como um relato vira registros

Exemplo feito à mão com o relato da Tailândia (jan/2023), no formato que a IA vai propor para você revisar:

```json
{
  "fonte": { "tipo": "relato_comunidade", "autoria": "terceiro", "viagem": "2023-01", "titulo": "Tailândia com milhas (jan/2023)" },
  "lugares": [
    { "destino": "Phi Phi", "nome": "Tom Yam Restaurant", "tipo": "restaurante", "tags": ["gastronomia", "barato"],
      "custo": { "valor": 12, "moeda": "BRL", "ref": "2023-01", "obs": "prato de Pad See Ew" }, "veredito": "recomendado" },
    { "destino": "Krabi", "nome": "Tiger Cave Temple", "tipo": "atracao", "tags": ["cultura", "trilha", "vista"],
      "tempo_visita_min": 120, "dica": "1.260 degraus, ~1 h de subida, macacos no começo", "veredito": "recomendado" },
    { "destino": "Bangkok", "nome": "Unicorn Café", "tipo": "restaurante", "veredito": "evitar",
      "resumo": "cardápio reduzido; só vale para foto se estiver no caminho" }
  ],
  "trechos": [
    { "origem": "Chiang Mai", "destino": "Sukhothai", "meio": "taxi", "duracao_min": 240,
      "custo": { "valor": 620, "moeda": "BRL", "ref": "2023-01", "obs": "o casal" },
      "obs": "ônibus leva ~12 h; só há 2 voos diários Sukhothai → Bangkok (8h e 10h)" }
  ],
  "dicas": [
    { "destino": "Bangkok", "categoria": "transporte", "texto": "Metrô, ônibus e barco são baratos; o Google Maps mostra as rotas." }
  ]
}
```

Nome e Instagram do autor do relato não entram.

## 4. O seu roteiro da Ásia como roteiro assinado

21 dias, GRU → Doha → Tailândia → Coreia → Doha → GRU. Na base, as datas viram **dias relativos**
(dia 1, dia 2…), e o que depende de data fica marcado:

- **Âncora sazonal:** o Yi Peng (Chiang Mai) muda de data todo ano (lua cheia do 12º mês lunar). Ao adaptar, o motor encaixa Chiang Mai nessa data ou avisa que o festival fica de fora.
- **Essência:** stopover em Doha na ida e na volta; ilhas (Phuket → Phi Phi → Krabi) por ferry antes do norte; Chiang Mai no festival; Bangkok; Coreia entrando por Busan e saindo por Seul de trem.
- **Pernoites:** Doha 1 (+ ½ na volta), Phuket 2, Phi Phi 3, Krabi 2, Chiang Mai 3, Bangkok 3, Busan 2, Seul 3½.

Esse roteiro também mostra por que a regra de região única precisa mudar: ele cruza três regiões.

## 5. Ingestão (o que será construído depois da aprovação)

1. Você sobe vários arquivos de uma vez no painel `/admin/base` (TXT, PDF, DOCX; o zip pode subir direto).
2. O servidor extrai o texto e guarda o original no Storage privado.
3. A IA propõe os registros (formato da seção 3), já procurando duplicatas para mesclar.
4. Você revisa num painel em fila: aprova, edita ou rejeita item por item, ou aprova o lote.
5. Ao aprovar, o sistema gera os embeddings e o registro passa a ser usado pelo gerador.

Custo estimado da extração dos 59 relatos com o Gemini Flash: dentro da cota grátis (≈120 mil tokens de entrada).
