// Perguntas frequentes, agrupadas. A landing mostra as primeiras; /faq mostra todas.

export type GrupoFaq = { id: string; titulo: string; itens: { p: string; r: string }[] };

export const FAQ_COMPLETO: GrupoFaq[] = [
  {
    id: "roteiros",
    titulo: "Roteiros",
    itens: [
      {
        p: "O que é um roteiro fluido?",
        r: "É uma rota em linha: você entra por uma cidade e sai por outra (voo open-jaw ou multidestino), sem voltar ao ponto de partida só para pegar o avião e sem bate-e-volta entre bases.",
      },
      {
        p: "Por que entrar e sair por cidades diferentes?",
        r: "Porque as portas são escolhidas entre os hubs com voo direto ou de uma conexão saindo de São Paulo, que quase sempre têm as passagens mais baratas. Do hub até o lugar que você quer, o roteiro usa trem, carro ou um voo curto. Você não perde dias nem dinheiro voltando pelo mesmo caminho.",
      },
      {
        p: "O roteiro me prende a uma companhia aérea?",
        r: "Não. A companhia fica livre para você escolher pela melhor tarifa. Stopovers (como Doha, Dubai ou Istambul) aparecem só como sugestão opcional, quando valem a pena.",
      },
      {
        p: "Quanto tempo leva para o roteiro ficar pronto?",
        r: "Em geral, menos de dois minutos depois das oito perguntas.",
      },
      {
        p: "Posso mudar o roteiro depois?",
        r: "Pode. Cada consulta inclui 3 ajustes em linguagem natural, como “troque Florença por Bolonha”. As versões anteriores ficam guardadas.",
      },
      {
        p: "Posso sair de outra cidade que não São Paulo?",
        r: "Pode. São Paulo vem preenchida, mas você troca pela sua cidade e pode aceitar aeroportos alternativos se o voo compensar.",
      },
      {
        p: "As informações são confiáveis?",
        r: "O roteiro usa uma base de relatos de viagens reais e passa por checagens automáticas (dias, trechos, lugares evitados e região). Horários, preços e regras mudam: confira antes de comprar.",
      },
    ],
  },
  {
    id: "produtos",
    titulo: "Produtos",
    itens: [
      {
        p: "Qual a diferença entre roteiro, assinado, completo e consultoria?",
        r: "O roteiro é montado na hora a partir das suas respostas. O assinado é uma viagem feita e validada pelo consultor, adaptada às suas datas. O completo soma ao roteiro o preço de referência das passagens e 2 ou 3 hotéis por cidade. A consultoria é o atendimento pessoal do consultor, com contato direto e suporte 24 horas pelo WhatsApp.",
      },
      {
        p: "A Compass vende passagens ou reserva hotéis?",
        r: "Não. Mostramos preços de referência, com a data da consulta, e links para comprar no site do parceiro. Podemos receber comissão por esses links, sem custo extra para você.",
      },
      {
        p: "Comprei o roteiro. Dá para adicionar passagens e hotéis depois?",
        r: "Não. Passagens e hotéis fazem parte do Completo, que já é gerado com tudo de uma vez. Se quiser, compre um Completo e gere a viagem de novo.",
      },
      {
        p: "Por quanto tempo os preços do Completo são atualizados?",
        r: "Durante 15 dias, uma vez por dia. É o prazo para você decidir e comprar as passagens. Depois disso, o roteiro mostra a última cotação, com a data.",
      },
      {
        p: "Existe roteiro grátis?",
        r: "Sim. Toda conta nova ganha o primeiro roteiro grátis (sem passagens e hotéis).",
      },
      {
        p: "Os preços das passagens são garantidos?",
        r: "Não. São preços encontrados recentemente, com a data da cotação, para você ter uma ideia de quanto vai gastar. O valor final aparece no site onde você comprar.",
      },
      {
        p: "Quem é o consultor?",
        r: "Quem criou o método: já viajou por 4 continentes (Américas do Sul e do Norte, Europa e Ásia), 14 países e mais de 70 cidades, e fala português, inglês, espanhol e francês.",
      },
    ],
  },
  {
    id: "pagamento",
    titulo: "Pagamento e reembolso",
    itens: [
      { p: "Como posso pagar?", r: "Pix ou cartão de crédito, pelo Mercado Pago. Os planos de agência são cobrados todo mês no cartão." },
      { p: "Quanto tempo vale o que eu comprar?", r: "Os créditos avulsos valem 12 meses a partir da compra." },
      {
        p: "Posso pedir reembolso?",
        r: "Sim, em até 7 dias depois da compra, desde que o crédito ainda não tenha sido usado. Como o roteiro é conteúdo digital entregue na hora em que é gerado, depois de gerado o crédito não é mais reembolsável; para isso existem os 3 ajustes incluídos e o nosso suporte. Na consultoria, o reembolso vale até o consultor começar o atendimento. Para pedir, abra um chamado em Ajuda.",
      },
      { p: "E se a geração do roteiro falhar?", r: "O crédito volta para a sua conta automaticamente." },
    ],
  },
  {
    id: "agencias",
    titulo: "Agências",
    itens: [
      {
        p: "Como funciona o plano para agências?",
        r: "Você escolhe o Basic ou o Premium, informa o nome da agência e paga. O painel abre com a sua marca no PDF, equipe na mesma conta e créditos mensais (Basic) ou uso justo (Premium).",
      },
      { p: "Posso cancelar?", r: "Quando quiser. O plano vale até o fim do mês já pago." },
    ],
  },
  {
    id: "conta",
    titulo: "Conta e suporte",
    itens: [
      {
        p: "Como falo com vocês?",
        r: "Pela página Ajuda: abra um chamado e acompanhe a resposta por lá (avisamos também por e-mail). Quem contrata a consultoria fala direto com o consultor pelo WhatsApp.",
      },
      { p: "Como apago a minha conta?", r: "Abra um chamado em Ajuda com o assunto “Apagar conta”. Removemos seus dados em até 7 dias." },
    ],
  },
];

export const FAQ_LANDING = [FAQ_COMPLETO[0].itens[0], FAQ_COMPLETO[0].itens[1], FAQ_COMPLETO[0].itens[2], FAQ_COMPLETO[1].itens[0], FAQ_COMPLETO[1].itens[1], FAQ_COMPLETO[2].itens[2]];
