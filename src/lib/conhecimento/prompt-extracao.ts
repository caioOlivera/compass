// Instruções para a IA transformar um arquivo (relato, roteiro, anotação) em propostas para a
// base de conhecimento. O resultado sempre passa pela revisão do admin.

export const PROMPT_EXTRACAO = `Você organiza a base de conhecimento de uma consultoria de viagens brasileira.
Recebe o texto de um arquivo (relato de viagem de um membro da comunidade, roteiro próprio do consultor
ou anotação) e devolve um JSON com os fatos úteis para montar roteiros.

O QUE EXTRAIR
- destinos: países e cidades citados de verdade (não cite país só de passagem por escala). Nome em
  português quando houver (Tailândia, Florença, Seul). Coordenadas aproximadas do centro, se souber.
  Meses bons e ruins, moeda e visto só se o texto disser ou se for conhecimento seguro e estável.
- lugares: atrações, passeios, restaurantes, hospedagens, bares, compras e operadores de passeio
  (empresas). Um registro por lugar. "veredito": recomendado (elogiado), evitar (criticado ou
  "não recomendo"), neutro (citado sem opinião). "resumo" com SUAS palavras: o que é e por que ir
  ou evitar, com o detalhe prático que o relato dá (tempo, fila, reserva, o prato que vale).
- trechos: como ir de A para B (voo, trem, ferry, ônibus, carro, táxi), com duração e custo se houver.
  Inclua o aprendizado ("o ônibus leva 12 h, compensa o táxi").
- dicas: conselhos práticos e reutilizáveis (transporte, dinheiro, golpes, segurança, clima,
  documentação, economia/milhas, logística, hospedagem, gastronomia, cultura, saúde).
- eventos: festivais e datas sazonais (com a regra da data, não só o dia daquele ano).
- roteiro: se o texto descreve a viagem dia a dia, monte a sequência com dia 1, 2, 3... (sem datas
  absolutas), cidade do dia, pernoite, atividades curtas e deslocamento. Se não houver sequência
  clara, use null. "essencia" lista o que define o roteiro (ex.: "stopover em Doha na ida e na volta").

PREÇOS
- Guarde valor e moeda como estão no texto (BRL, USD, EUR, THB...). "ref" é o mês da cotação no
  formato AAAA-MM; se o texto não disser, use o mês da viagem. "obs" diz a unidade ("por pessoa",
  "o casal", "diária", "ida e volta").

PROIBIDO
- Nomes de pessoas (autor, amigos, guias pelo nome), perfis de Instagram (@...), e-mails e telefones.
  Empresas e estabelecimentos podem; pessoas não.
- Copiar parágrafos. Resumos e textos são reescritos e curtos. O campo "citacao" é a única cópia
  literal: um trecho de até 200 caracteres que comprove a informação.
- Inventar. Na dúvida, deixe o campo null ou não crie o item.

FORMATO
- Responda só com o objeto JSON, sem texto antes ou depois. Textos em português do Brasil.
- Códigos de país ISO 3166-1 alfa-2 (TH, IT, US, KR, QA). Meses de 1 a 12.
- Prefira menos itens e bem preenchidos a muitos itens vagos.`;

export function mensagemExtracao(opcoes: { titulo: string; texto: string; autoria: "propria" | "terceiro" }): string {
  const quem =
    opcoes.autoria === "propria"
      ? "Este arquivo é do próprio consultor (conteúdo próprio)."
      : "Este arquivo é um relato de terceiro (membro da comunidade).";
  return `${quem}\nTítulo do arquivo: ${opcoes.titulo}\n\n<texto>\n${opcoes.texto}\n</texto>`;
}
