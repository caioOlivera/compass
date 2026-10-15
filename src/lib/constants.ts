// Opções fixas do wizard. A IA nunca pode sair da sub-região escolhida (regra imutável).
export const SUBREGIOES = [
  { id: "america-do-norte", continente: "América", nome: "América do Norte" },
  { id: "america-central", continente: "América", nome: "América Central" },
  { id: "america-do-sul", continente: "América", nome: "América do Sul" },
  { id: "europa-do-norte", continente: "Europa", nome: "Europa do Norte" },
  { id: "europa-do-sul", continente: "Europa", nome: "Europa do Sul" },
  { id: "europa-central-leste", continente: "Europa", nome: "Europa Central/Leste" },
  { id: "asia-leste", continente: "Ásia", nome: "Ásia Leste" },
  { id: "oriente-medio", continente: "Ásia", nome: "Oriente Médio" },
  { id: "sudeste-asiatico", continente: "Ásia", nome: "Sudeste Asiático" },
  { id: "africa-do-norte", continente: "África", nome: "África do Norte" },
  { id: "africa-subsaariana", continente: "África", nome: "África Subsaariana" },
  { id: "oceania", continente: "Oceania", nome: "Oceania" },
] as const;

export const RITMOS = [
  { id: "lento", nome: "Lento", descricao: "Mais tempo em cada base, poucas trocas de hotel." },
  { id: "medio", nome: "Médio", descricao: "Equilíbrio entre ver bastante e descansar." },
  { id: "acelerado", nome: "Acelerado", descricao: "Muitas paradas, o mínimo de dias em cada uma." },
] as const;

export const TIPOS_PONTO = ["hub_entrada", "base_intermediaria", "auge_viagem", "hub_saida"] as const;

export const FLEXIBILIDADE_MAX_DIAS = 5;
