# Compass — notas de direção

## Inventário do assunto (o que só ele tem)
1. Nome: Compass = bússola. Agulha, rosa dos ventos, pontos cardeais N/S/L/O.
2. O produto entrega UMA LINHA no mapa: entra por uma cidade, sai por outra (open-jaw). Nunca volta.
3. Exemplo real: São Paulo (GRU) → Roma (FCO) → Florença → Dolomitas → Milão (MXP) → São Paulo. 15 dias: 3 + 2 + 8 + 2.
4. Artefatos impressos do mundo dele: cartão de embarque (GRU → FCO / MXP → GRU), bilhete de trem Frecciarossa, carimbo de passaporte.
5. Restrição que o define: nada de bate-e-volta; a viagem fica dentro de um continente.
6. "Auge da viagem": o lugar que faz a viagem valer a pena ganha mais dias.
7. Ritmo: lento / médio / acelerado (cidade 4+/3/2 dias; natureza 8-10/6-7/4-5).
8. Checklist por parada; trecho com meio de transporte e tempo.
9. Público: brasileiros saindo de São Paulo; pt-BR.
10. 7 perguntas no questionário.

## Argumento
- Hero: sua viagem em uma linha só, de uma porta à outra. Prova: a rota desenhada (coisa viva).
- Como funciona: 7 perguntas viram um mapa. Prova: as perguntas reais.
- Vitrine: a tela real do roteiro (mapa + checklist), construída em HTML.
- O ritmo muda os dias: lento/médio/acelerado aplicados ao mesmo roteiro. Prova: a conta real.
- CTA + rodapé.
## Direção escolhida: split-stage — o mapa é o lado fixo; rolar a página percorre a rota parada por parada.
## Ideia
Nesta página, a rota que só vai para a frente (SP → Roma → Florença → Dolomitas → Milão → SP) vira o lado fixo, que avança uma parada a cada seção.
Coisa viva: slider de ritmo (lento/médio/acelerado) redistribui os dias reais do roteiro.
- Tipo: Switzer (Fontshare) inacessível neste ambiente e ausente do npm → Inter Tight variável, auto-hospedada (mesma família neo-grotesca suíça).
- Imagens: coleções abertas e picsum bloqueados → fragmentos reais da interface (data-ui) + desenhos em código.
