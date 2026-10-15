import { dentroDaSubregiao } from "@/lib/geo/subregions";
import type { Itinerary } from "@/lib/validation/itinerary";
import { normalizarNome, type ItineraryPromptInput } from "@/lib/validation/trip-request";

// Regras de negócio que o schema não expressa. Rodam no servidor depois da IA; cada erro
// volta para o modelo na nova tentativa, então as mensagens são instruções diretas.
export function checarRegrasDoRoteiro(
  roteiro: Itinerary,
  pedido: ItineraryPromptInput,
  /** Ids da base de conhecimento enviados no prompt; referências fora deles são inventadas. */
  refsValidas?: ReadonlySet<string>,
): string[] {
  const erros: string[] = [];
  const pontos = roteiro.pontos_mapa;

  if (roteiro.resumo_estrategico.total_dias_viagem !== pedido.total_dias_viagem) {
    erros.push(
      `resumo_estrategico.total_dias_viagem deve ser ${pedido.total_dias_viagem}, veio ${roteiro.resumo_estrategico.total_dias_viagem}.`,
    );
  }

  const soma = pontos.reduce((s, p) => s + p.dias_alocados, 0);
  if (soma !== pedido.total_dias_viagem) {
    erros.push(`A soma de dias_alocados é ${soma}; precisa ser exatamente ${pedido.total_dias_viagem}.`);
  }

  pontos.forEach((p, i) => {
    const esperadoId = `p${i + 1}`;
    if (p.id_ponto !== esperadoId || p.ordem !== i + 1) {
      erros.push(`O ponto na posição ${i + 1} ("${p.nome_local}") deve ter id_ponto "${esperadoId}" e ordem ${i + 1}.`);
    }

    const ultimo = i === pontos.length - 1;
    if (ultimo && p.proximo_deslocamento !== null) {
      erros.push(`O último ponto ("${p.nome_local}") deve ter proximo_deslocamento null.`);
    }
    if (!ultimo) {
      const destinoEsperado = `p${i + 2}`;
      if (p.proximo_deslocamento === null) {
        erros.push(`"${p.nome_local}" precisa de proximo_deslocamento até ${destinoEsperado}.`);
      } else if (p.proximo_deslocamento.destino_id !== destinoEsperado) {
        erros.push(`proximo_deslocamento de "${p.nome_local}" deve apontar para "${destinoEsperado}".`);
      }
    }

    if (!pedido.regioes.some((r) => dentroDaSubregiao(r, p.coordenadas))) {
      erros.push(
        `"${p.nome_local}" (${p.coordenadas.lat}, ${p.coordenadas.lng}) está fora das regiões escolhidas (${pedido.regioes.join(", ")}). Confira as coordenadas ou troque o local.`,
      );
    }
  });

  if (pontos.length > 1) {
    if (pontos[0].tipo_ponto !== "hub_entrada") erros.push('O primeiro ponto deve ser "hub_entrada".');
    if (pontos.at(-1)!.tipo_ponto !== "hub_saida") erros.push('O último ponto deve ser "hub_saida".');
  }
  pontos.slice(1, -1).forEach((p) => {
    if (p.tipo_ponto === "hub_entrada" || p.tipo_ponto === "hub_saida") {
      erros.push(`"${p.nome_local}" está no meio da rota e não pode ser ${p.tipo_ponto}.`);
    }
  });

  // Bate-e-volta: o mesmo local duas vezes na rota. Exceção: o hub de conexão que abre e fecha a
  // viagem (stopover na ida e na volta, como Doha num roteiro pela Ásia).
  const vistos = new Map<string, number>();
  pontos.forEach((p, i) => {
    const k = normalizarNome(p.nome_local);
    const anterior = vistos.get(k);
    if (anterior === undefined) vistos.set(k, i);
    else if (!(anterior === 0 && i === pontos.length - 1)) {
      erros.push(`"${p.nome_local}" aparece duas vezes (posições ${anterior + 1} e ${i + 1}).`);
    }
  });

  // Plano dia a dia: um dia por dia alocado e numeração contínua na viagem inteira
  pontos.forEach((p) => {
    if (p.plano_dias.length !== p.dias_alocados) {
      erros.push(`"${p.nome_local}" tem ${p.dias_alocados} dias alocados, mas plano_dias tem ${p.plano_dias.length} entradas. Uma entrada por dia.`);
    }
  });
  const numeros = pontos.flatMap((p) => p.plano_dias.map((d) => d.dia));
  if (numeros.length === pedido.total_dias_viagem && numeros.some((n, i) => n !== i + 1)) {
    erros.push(`Os dias de plano_dias devem ir de 1 a ${pedido.total_dias_viagem}, em ordem e sem pular nem repetir.`);
  }

  if (refsValidas) {
    const inventadas = roteiro.referencias_base.filter((r) => !refsValidas.has(r));
    if (inventadas.length) {
      erros.push(`referencias_base tem ids que não existem na base enviada: ${inventadas.join(", ")}. Use só os ids [R..] recebidos.`);
    }
  }

  for (const evitar of pedido.locais_a_evitar) {
    const alvo = normalizarNome(evitar);
    const achado = pontos.find((p) => contemPalavra(normalizarNome(p.nome_local), alvo));
    if (achado) erros.push(`"${achado.nome_local}" está na lista de locais a evitar ("${evitar}"). Remova-o da rota.`);
  }

  return erros;
}

/** "veneza" casa com "veneza mestre", mas "roma" não casa com "romania". */
function contemPalavra(texto: string, alvo: string): boolean {
  return ` ${texto} `.includes(` ${alvo} `);
}
