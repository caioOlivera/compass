import { checarRegrasDoRoteiro } from "@/lib/itinerary/rules";
import { ItinerarySchema, type Itinerary } from "@/lib/validation/itinerary";
import type { ItineraryPromptInput } from "@/lib/validation/trip-request";

// Motor de roteiros, independente do provedor de IA: chama o modelo, valida com Zod e com as
// regras de negócio e, se o roteiro vier com problema, faz uma nova tentativa com o JSON
// anterior e a lista de erros. Cada provedor só implementa um ChamadorModelo (providers/).

const MAX_TENTATIVAS = 2;

export type RespostaModelo = {
  texto: string;
  /** fim = terminou normalmente; tamanho = cortado por limite de tokens; recusa = o modelo recusou */
  parada: "fim" | "tamanho" | "recusa";
  modelo: string;
  inputTokens: number;
  outputTokens: number;
};

/** Recebe a mensagem do usuário (o system prompt é responsabilidade de cada provedor). */
export type ChamadorModelo = (mensagem: string) => Promise<RespostaModelo>;

export type ResultadoGeracao = {
  roteiro: Itinerary;
  modelo: string;
  tentativas: number;
  inputTokens: number;
  outputTokens: number;
  latenciaMs: number;
};

export type MotivoFalha = "recusa" | "invalido" | "truncado";

/** Trechos da base de conhecimento enviados ao modelo, cada um com um id curto ([R1], [R2]...). */
export type ContextoBase = { texto: string; refs: string[] };

/** Roteiro assinado (pronto) a adaptar: sequência de dias, essência e eventos com data variável. */
export type RoteiroBaseAdaptar = {
  titulo: string;
  duracao_dias: number;
  epoca: string | null;
  essencia: string[];
  dias: {
    dia: number;
    cidade: string;
    pernoite: string | null;
    atividades: string[];
    deslocamento: unknown;
    obs: string | null;
  }[];
  eventos: { destino: string; nome: string; regra_data: string }[];
};

/**
 * Como gerar: do zero (padrão), ajustando um roteiro existente ou adaptando um roteiro assinado.
 * No ajuste, o modelo parte do roteiro atual e só muda o que foi pedido.
 */
export type ModoGeracao =
  | { tipo: "ajuste"; roteiroAtual: Itinerary; pedido: string }
  | { tipo: "adaptacao"; base: RoteiroBaseAdaptar };

export class GeracaoError extends Error {
  constructor(
    readonly motivo: MotivoFalha,
    message: string,
    readonly detalhes: string[] = [],
  ) {
    super(message);
    this.name = "GeracaoError";
  }
}

export async function gerarRoteiro(
  pedido: ItineraryPromptInput,
  chamar: ChamadorModelo,
  contexto?: ContextoBase,
  modo?: ModoGeracao,
): Promise<ResultadoGeracao> {
  const inicio = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let anterior: { json: string; erros: string[] } | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const resposta = await chamar(
      montarMensagem(pedido, anterior, contexto, modo),
    );
    inputTokens += resposta.inputTokens;
    outputTokens += resposta.outputTokens;

    if (resposta.parada === "recusa") {
      throw new GeracaoError(
        "recusa",
        "A IA não aceitou gerar este roteiro. Revise as observações e tente de novo.",
      );
    }

    const texto = extrairJson(resposta.texto);
    const erros =
      resposta.parada === "tamanho"
        ? [
            "A resposta anterior foi cortada por tamanho. Seja mais conciso nos textos e checklists.",
          ]
        : validar(texto, pedido, new Set(contexto?.refs ?? []));

    if (erros.length === 0) {
      return {
        roteiro: ItinerarySchema.parse(JSON.parse(texto)),
        modelo: resposta.modelo,
        tentativas: tentativa,
        inputTokens,
        outputTokens,
        latenciaMs: Date.now() - inicio,
      };
    }

    anterior = { json: texto, erros };
    if (tentativa === MAX_TENTATIVAS) {
      const motivo: MotivoFalha =
        resposta.parada === "tamanho" ? "truncado" : "invalido";
      throw new GeracaoError(
        motivo,
        "Não conseguimos montar um roteiro consistente. Tente de novo.",
        erros,
      );
    }
  }

  throw new Error("inalcançável");
}

/**
 * Modelos sem saída estruturada (comum em modelos locais) às vezes embrulham o JSON em
 * ```json ... ``` ou escrevem o raciocínio em <think>...</think> antes. Fica só o objeto.
 */
export function extrairJson(texto: string): string {
  const semPensamento = texto.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const cerca = semPensamento.match(/```(?:json)?\s*([\s\S]*?)```/);
  const corpo = (cerca ? cerca[1] : semPensamento).trim();
  const inicio = corpo.indexOf("{");
  const fim = corpo.lastIndexOf("}");
  return inicio !== -1 && fim > inicio ? corpo.slice(inicio, fim + 1) : corpo;
}

function validar(
  texto: string,
  pedido: ItineraryPromptInput,
  refs: ReadonlySet<string>,
): string[] {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return [
      "A resposta não era um JSON válido. Responda apenas com o objeto JSON, sem texto em volta.",
    ];
  }
  const r = ItinerarySchema.safeParse(bruto);
  if (!r.success) {
    return r.error.issues.map(
      (i) => `Campo ${i.path.join(".") || "(raiz)"}: ${i.message}`,
    );
  }
  return checarRegrasDoRoteiro(r.data, pedido, refs);
}

function montarMensagem(
  pedido: ItineraryPromptInput,
  anterior: { json: string; erros: string[] } | null,
  contexto?: ContextoBase,
  modo?: ModoGeracao,
): string {
  const respostas =
    modo?.tipo === "adaptacao"
      ? mensagemAdaptacao(pedido, modo.base)
      : modo?.tipo === "ajuste"
        ? [
            `Respostas do questionário (continuam valendo):\n\n${JSON.stringify(pedido, null, 2)}`,
            `Roteiro atual do viajante:\n<roteiro_atual>\n${JSON.stringify(modo.roteiroAtual)}\n</roteiro_atual>`,
            `O viajante pediu este ajuste:\n<pedido_de_ajuste>\n${modo.pedido}\n</pedido_de_ajuste>`,
            "Aplique só o que foi pedido e mantenha o resto do roteiro igual (paradas, dias, textos). " +
              "O total de dias não muda. Se o pedido for impossível com as regras (mudar datas, sair das regiões), " +
              "mantenha o roteiro e explique em resumo_estrategico.alertas. Devolva o roteiro completo.",
          ].join("\n\n")
        : `Monte o roteiro para estas respostas do questionário:\n\n${JSON.stringify(pedido, null, 2)}`;
  const base = contexto?.texto
    ? `${respostas}\n\n<base_de_conhecimento>\n${contexto.texto}\n</base_de_conhecimento>`
    : `${respostas}\n\n(Sem registros da base de conhecimento para este destino: use referencias_base vazio.)`;
  if (!anterior) return base;
  return [
    base,
    "Uma tentativa anterior gerou o roteiro abaixo, mas ele tem problemas.",
    `<roteiro_anterior>\n${anterior.json}\n</roteiro_anterior>`,
    `Corrija todos estes problemas e devolva o roteiro completo:\n${anterior.erros.map((e) => `- ${e}`).join("\n")}`,
  ].join("\n\n");
}

/** Roteiro assinado: a sequência e a essência são do consultor; a IA só adapta ao viajante. */
function mensagemAdaptacao(
  pedido: ItineraryPromptInput,
  base: RoteiroBaseAdaptar,
): string {
  return [
    "Este é um ROTEIRO ASSINADO: foi feito e validado pelo consultor. Adapte-o para o viajante abaixo sem reescrever a essência.",
    `Respostas do viajante:\n${JSON.stringify(pedido, null, 2)}`,
    `<roteiro_assinado>\n${JSON.stringify(base)}\n</roteiro_assinado>`,
    [
      "Regras da adaptação:",
      '- Mantenha a sequência de cidades, os meios de transporte entre elas e tudo o que está em "essencia".',
      "- Cada cidade (ou estadia contínua na mesma cidade) vira um ponto do mapa, na mesma ordem; dias_alocados segue o roteiro.",
      "- Encaixe as datas do viajante: dia 1 do roteiro = data_inicio. Considere clima e sazonalidade dessas datas.",
      '- Eventos com data variável ("eventos"): calcule a data no ano da viagem. Se cair fora da cidade certa, ' +
        "reorganize só o mínimo para encaixar (sem mudar a ordem das cidades) ou explique em alertas que ficou de fora.",
      "- Adapte ao ritmo, às crianças, ao orçamento e aos interesses só dentro de cada dia (atividades e plano_dias).",
      "- Preencha checklist, plano_dias e restaurantes usando as atividades do roteiro e a base de conhecimento.",
      "- Companhia aérea e stopover citados no roteiro são da viagem original, não regra: deixe a companhia livre e, " +
        "se valer a pena, cite o stopover só como opção em alertas.",
      "- Portas de entrada e saída seguem a regra de portas (hubs saindo de GRU). Se o roteiro começar ou terminar " +
        "longe de uma porta, inclua a chegada e a saída pela porta mais próxima, com trem, carro ou voo curto até o miolo.",
      "- Se a viagem tiver mais dias que o roteiro assinado, o miolo mantém os dias dele e os dias extras viram " +
        "cidades antes e depois, no caminho entre as portas e o miolo (open-jaw dentro do open-jaw).",
    ].join("\n"),
  ].join("\n\n");
}
