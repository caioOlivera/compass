import { dentroDaSubregiao } from "@/lib/geo/subregions";
import type { Itinerary } from "@/lib/validation/itinerary";
import { normalizarNome, type ItineraryPromptInput } from "@/lib/validation/trip-request";

// Regras de negócio que o schema não expressa. Rodam no servidor depois da IA; cada erro
// volta para o modelo na nova tentativa, então as mensagens são instruções diretas.
export function checarRegrasDoRoteiro(roteiro: Itinerary, pedido: ItineraryPromptInput): string[] {
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

    if (!dentroDaSubregiao(pedido.continente_regiao, p.coordenadas)) {
      erros.push(
        `"${p.nome_local}" (${p.coordenadas.lat}, ${p.coordenadas.lng}) está fora da sub-região ${pedido.continente_regiao}. Confira as coordenadas ou troque o local.`,
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

  // Bate-e-volta: o mesmo local duas vezes na rota
  const vistos = new Map<string, number>();
  pontos.forEach((p, i) => {
    const k = normalizarNome(p.nome_local);
    if (vistos.has(k)) erros.push(`"${p.nome_local}" aparece duas vezes (posições ${vistos.get(k)! + 1} e ${i + 1}).`);
    else vistos.set(k, i);
  });

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
