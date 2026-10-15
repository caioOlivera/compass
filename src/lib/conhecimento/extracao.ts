import { z } from "zod";

// Formato que a IA devolve ao ler um arquivo (relato, roteiro, anotação). Cada item vira uma
// proposta na fila de revisão; nada entra na base sem aprovação do admin.
// Regras de conteúdo (no prompt e conferidas aqui quando dá): sem nomes, perfis ou telefones de
// pessoas; resumos curtos com palavras próprias; citação literal curta só para conferência.

export const TIPOS_DESTINO = ["pais", "regiao", "cidade"] as const;
export const TIPOS_LUGAR = ["atracao", "passeio", "restaurante", "hospedagem", "bar", "compras", "operador"] as const;
export const VEREDITOS = ["recomendado", "neutro", "evitar"] as const;
export const MEIOS_TRANSPORTE = ["voo", "trem", "ferry", "barco", "onibus", "carro", "taxi", "outro"] as const;
export const CATEGORIAS_DICA = [
  "transporte",
  "dinheiro",
  "golpes",
  "seguranca",
  "clima",
  "documentacao",
  "economia",
  "logistica",
  "hospedagem",
  "gastronomia",
  "cultura",
  "saude",
] as const;
export const TAGS_LUGAR = [
  "cultura",
  "historia",
  "natureza",
  "praia",
  "trilha",
  "vista",
  "gastronomia",
  "barato",
  "luxo",
  "vida-noturna",
  "compras",
  "criancas",
  "aventura",
  "romantico",
  "fotografia",
  "museu",
  "religioso",
] as const;

const MesRef = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use AAAA-MM")
  .describe("Mês de referência, AAAA-MM");
const Mes = z.int().min(1).max(12);
const Citacao = z.string().trim().min(3).max(240).describe("Trecho literal curto do texto, só para conferência");
const CodigoPais = z
  .string()
  .regex(/^[A-Z]{2}$/, "ISO 3166-1 alfa-2, ex.: TH")
  .describe("Código ISO do país, ex.: TH, IT, US");

export const CustoSchema = z.object({
  valor: z.number().nonnegative(),
  moeda: z.string().regex(/^[A-Z]{3}$/).describe("ISO 4217: BRL, USD, EUR, THB..."),
  ref: MesRef.nullable().describe("Mês da cotação; use o mês da viagem se o texto não disser"),
  obs: z.string().max(120).nullable().describe('Ex.: "por pessoa", "o casal", "ida e volta"'),
});

export const DestinoExtraidoSchema = z.object({
  nome: z.string().trim().min(2).max(80).describe("Nome em português quando houver (Tailândia, Florença)"),
  tipo: z.enum(TIPOS_DESTINO),
  pais_codigo: CodigoPais,
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  resumo: z.string().max(300).nullable(),
  melhor_epoca_meses: z.array(Mes).max(12),
  evitar_meses: z.array(Mes).max(12),
  moeda: z.string().regex(/^[A-Z]{3}$/).nullable(),
  visto: z.string().max(200).nullable().describe("Exigência de visto para brasileiros, se o texto falar"),
});

export const LugarExtraidoSchema = z.object({
  destino: z.string().trim().min(2).max(80).describe("Cidade (ou região) onde fica"),
  pais_codigo: CodigoPais,
  nome: z.string().trim().min(2).max(120),
  tipo: z.enum(TIPOS_LUGAR),
  tags: z.array(z.enum(TAGS_LUGAR)).max(6),
  resumo: z.string().trim().min(5).max(300).describe("Com palavras próprias: o que é, por que ir ou evitar"),
  tempo_visita_min: z.int().min(5).max(24 * 60).nullable(),
  custo: CustoSchema.nullable(),
  reservar_antes: z.boolean().nullable(),
  melhor_horario: z.string().max(80).nullable(),
  veredito: z.enum(VEREDITOS),
  citacao: Citacao,
});

export const TrechoExtraidoSchema = z.object({
  origem: z.string().trim().min(2).max(80),
  destino: z.string().trim().min(2).max(80),
  pais_codigo_origem: CodigoPais,
  pais_codigo_destino: CodigoPais,
  meio: z.enum(MEIOS_TRANSPORTE),
  duracao_min: z.int().min(5).max(48 * 60).nullable(),
  custo: CustoSchema.nullable(),
  operador: z.string().max(80).nullable().describe("Empresa (companhia aérea, ferry, ônibus), nunca pessoa"),
  obs: z.string().max(300).nullable(),
  citacao: Citacao,
});

export const DicaExtraidaSchema = z.object({
  destino: z.string().trim().min(2).max(80).describe("Cidade, região ou país a que a dica se aplica"),
  pais_codigo: CodigoPais,
  lugar: z.string().max(120).nullable().describe("Nome do lugar, se a dica for sobre um lugar específico"),
  categoria: z.enum(CATEGORIAS_DICA),
  texto: z.string().trim().min(10).max(400),
  citacao: Citacao,
});

export const EventoExtraidoSchema = z.object({
  destino: z.string().trim().min(2).max(80),
  pais_codigo: CodigoPais,
  nome: z.string().trim().min(2).max(120),
  regra_data: z.string().max(200).describe('Ex.: "lua cheia do 12º mês lunar (nov)", "último fim de semana de julho"'),
  meses: z.array(Mes).min(1).max(12),
  citacao: Citacao,
});

export const DiaRoteiroSchema = z.object({
  dia: z.int().min(1).max(120),
  cidade: z.string().trim().min(2).max(80),
  pais_codigo: CodigoPais,
  pernoite: z.string().max(80).nullable().describe("Onde dorme; null se dorme em voo/trânsito"),
  atividades: z.array(z.string().trim().min(2).max(160)).max(12),
  deslocamento: z
    .object({
      meio: z.enum(MEIOS_TRANSPORTE),
      de: z.string().max(80),
      para: z.string().max(80),
      obs: z.string().max(200).nullable(),
    })
    .nullable(),
  obs: z.string().max(300).nullable(),
});

export const RoteiroExtraidoSchema = z.object({
  titulo: z.string().trim().min(3).max(120),
  duracao_dias: z.int().min(1).max(120),
  resumo: z.string().max(600),
  epoca: z.string().max(120).nullable().describe('Ex.: "novembro (Yi Peng)", "verão europeu"'),
  essencia: z.array(z.string().max(200)).max(10).describe("O que não pode mudar ao adaptar"),
  dias: z.array(DiaRoteiroSchema).min(1).max(120),
});

export const ExtracaoSchema = z.object({
  fonte: z.object({
    titulo: z.string().trim().min(3).max(160),
    viagem_mes: MesRef.nullable(),
    paises: z.array(CodigoPais).max(30),
  }),
  destinos: z.array(DestinoExtraidoSchema).max(40),
  lugares: z.array(LugarExtraidoSchema).max(120),
  trechos: z.array(TrechoExtraidoSchema).max(60),
  dicas: z.array(DicaExtraidaSchema).max(80),
  eventos: z.array(EventoExtraidoSchema).max(20),
  roteiro: RoteiroExtraidoSchema.nullable(),
});

export type Custo = z.infer<typeof CustoSchema>;
export type DestinoExtraido = z.infer<typeof DestinoExtraidoSchema>;
export type LugarExtraido = z.infer<typeof LugarExtraidoSchema>;
export type TrechoExtraido = z.infer<typeof TrechoExtraidoSchema>;
export type DicaExtraida = z.infer<typeof DicaExtraidaSchema>;
export type EventoExtraido = z.infer<typeof EventoExtraidoSchema>;
export type RoteiroExtraido = z.infer<typeof RoteiroExtraidoSchema>;
export type Extracao = z.infer<typeof ExtracaoSchema>;

/** Tipos de item da fila de revisão (um por registro proposto). */
export const TIPOS_ITEM = ["destino", "lugar", "trecho", "dica", "evento", "roteiro"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

const SCHEMA_POR_TIPO = {
  destino: DestinoExtraidoSchema,
  lugar: LugarExtraidoSchema,
  trecho: TrechoExtraidoSchema,
  dica: DicaExtraidaSchema,
  evento: EventoExtraidoSchema,
  roteiro: RoteiroExtraidoSchema,
} as const;

export function schemaDoItem(tipo: TipoItem) {
  return SCHEMA_POR_TIPO[tipo];
}

/** Desmonta a extração em itens de revisão, na ordem: destinos primeiro (os outros dependem deles). */
export function itensDaExtracao(e: Extracao): { tipo: TipoItem; dados: unknown }[] {
  return [
    ...e.destinos.map((dados) => ({ tipo: "destino" as const, dados })),
    ...e.lugares.map((dados) => ({ tipo: "lugar" as const, dados })),
    ...e.trechos.map((dados) => ({ tipo: "trecho" as const, dados })),
    ...e.dicas.map((dados) => ({ tipo: "dica" as const, dados })),
    ...e.eventos.map((dados) => ({ tipo: "evento" as const, dados })),
    ...(e.roteiro ? [{ tipo: "roteiro" as const, dados: e.roteiro }] : []),
  ];
}

// Dados pessoais que não podem entrar na base (LGPD): perfis @, e-mails, telefones.
const PERFIL = /(^|\s)@[A-Za-z0-9_.]{3,}/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/i;
const TELEFONE = /(\+?\d{2}\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/;

/** Campos de texto livre de um item que contêm dado pessoal (para barrar antes de aprovar). */
export function dadosPessoaisNoItem(dados: unknown): string[] {
  const achados: string[] = [];
  const visitar = (v: unknown, caminho: string) => {
    if (typeof v === "string") {
      if (PERFIL.test(v) || EMAIL.test(v) || TELEFONE.test(v)) achados.push(caminho);
    } else if (Array.isArray(v)) v.forEach((x, i) => visitar(x, `${caminho}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visitar(x, caminho ? `${caminho}.${k}` : k);
  };
  visitar(dados, "");
  return achados;
}
