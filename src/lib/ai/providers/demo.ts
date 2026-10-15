import type { ResultadoGeracao } from "@/lib/ai/generate";
import { roteiroPRD } from "@/lib/itinerary/exemplo";
import type { Itinerary, PontoMapa } from "@/lib/validation/itinerary";
import type { ItineraryPromptInput } from "@/lib/validation/trip-request";

// Modo demonstração: não chama IA nenhuma. Devolve o roteiro de exemplo (Roma → Dolomitas →
// Milão) com os dias redistribuídos para o total pedido, para o fluxo inteiro funcionar
// (questionário, gravação, mapa, checklist) sem chave de API e sem custo.

const AVISO =
  "Modo demonstração: este é um roteiro de exemplo fixo, não gerado a partir das suas respostas. Configure um provedor de IA para gerar roteiros de verdade.";

export async function gerarRoteiroDemonstracao(pedido: ItineraryPromptInput): Promise<ResultadoGeracao> {
  const inicio = Date.now();
  // Pequena espera para a tela de "gerando" aparecer como no fluxo real
  await new Promise((r) => setTimeout(r, 1500));
  return {
    roteiro: roteiroDemonstracao(pedido.total_dias_viagem),
    modelo: "demonstracao",
    tentativas: 1,
    inputTokens: 0,
    outputTokens: 0,
    latenciaMs: Date.now() - inicio,
  };
}

export function roteiroDemonstracao(totalDias: number): Itinerary {
  const base = roteiroPRD();
  // Cada parada precisa de pelo menos 1 dia: viagens curtas ficam com menos paradas
  const indices = totalDias >= 4 ? [0, 1, 2, 3] : totalDias >= 2 ? [0, 3] : [0];
  const escolhidos = indices.map((i) => base.pontos_mapa[i]);
  const dias = distribuir(
    escolhidos.map((p) => p.dias_alocados),
    totalDias,
  );

  const pontos: PontoMapa[] = escolhidos.map((p, i) => {
    const ultimo = i === escolhidos.length - 1;
    return {
      ...p,
      id_ponto: `p${i + 1}`,
      ordem: i + 1,
      dias_alocados: dias[i],
      tipo_ponto: escolhidos.length === 1 ? "hub_entrada" : i === 0 ? "hub_entrada" : ultimo ? "hub_saida" : p.tipo_ponto,
      proximo_deslocamento: ultimo
        ? null
        : { ...(p.proximo_deslocamento ?? escolhidos[0].proximo_deslocamento!), destino_id: `p${i + 2}` },
    };
  });

  return {
    titulo: `${base.titulo} (exemplo)`,
    resumo_estrategico: {
      ...base.resumo_estrategico,
      total_dias_viagem: totalDias,
      alertas: [AVISO, ...base.resumo_estrategico.alertas],
    },
    pontos_mapa: pontos,
  };
}

/** Reparte `total` proporcionalmente aos pesos (maiores restos), com mínimo de 1 por item. */
function distribuir(pesos: number[], total: number): number[] {
  const extra = total - pesos.length;
  const soma = pesos.reduce((a, b) => a + b, 0);
  const brutos = pesos.map((p) => (p / soma) * extra);
  const dias = brutos.map((b) => 1 + Math.floor(b));
  let faltam = total - dias.reduce((a, b) => a + b, 0);
  const ordem = brutos.map((b, i) => [b - Math.floor(b), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; faltam > 0; k = (k + 1) % ordem.length, faltam--) dias[ordem[k][1]]++;
  return dias;
}
