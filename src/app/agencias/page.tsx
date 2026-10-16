import { Building2, FileText, Map, MessageCircle, Plane, Sparkles, Users, Wand2 } from "lucide-react";
import type { Metadata } from "next";
import { AssinarAgencia } from "@/components/agencia/assinar-agencia";
import { Rodape } from "@/components/landing/fechamento";
import { SiteHeader } from "@/components/landing/site-header";
import { lerConfig } from "@/lib/configuracoes";
import { formatarPreco } from "@/lib/motor/catalogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Compass para agências",
  description: "Roteiros fluidos com a marca da sua agência, equipe na mesma conta e consultas completas com passagens e hotéis.",
};

const BENEFICIOS = [
  { icone: FileText, titulo: "PDF com a sua marca", texto: "Logo, cores e contato da agência no lugar da Compass. O cliente recebe um material seu." },
  { icone: Map, titulo: "Rota pronta em minutos", texto: "Open-jaw, dias por parada, trechos com transporte e tempo, checklist e mapa interativo." },
  { icone: Plane, titulo: "Passagens e hotéis", texto: "Cada consulta completa traz o preço de referência das passagens e 2 ou 3 hotéis por cidade." },
  { icone: Wand2, titulo: "Ajustes em linguagem natural", texto: "\"Troque Florença por Bolonha\": o roteiro se refaz e guarda as versões anteriores." },
  { icone: Users, titulo: "Equipe na mesma conta", texto: "Até 20 pessoas usando os mesmos créditos e a mesma marca." },
  { icone: Sparkles, titulo: "Roteiros assinados", texto: "Viagens testadas pelo consultor, prontas para adaptar às datas do seu cliente." },
  { icone: MessageCircle, titulo: "Suporte direto", texto: "Atendimento pelo WhatsApp com quem montou o método." },
  { icone: Building2, titulo: "Base de relatos reais", texto: "Dicas, lugares e trechos tirados de dezenas de viagens feitas de verdade." },
];

const PERGUNTAS = [
  ["Preciso criar a agência antes?", "Não. Você escolhe o plano, informa o nome da agência e paga. O painel (marca, equipe e créditos) abre assim que o pagamento é confirmado."],
  ["Como é a cobrança?", "Mensal, no cartão de crédito, pelo Mercado Pago. Dá para cancelar quando quiser; o plano vale até o fim do mês pago."],
  ["Os créditos do Basic acumulam?", "Não. São 30 consultas completas por mês, renovadas a cada cobrança."],
  ["O que é uso justo no Premium?", "Não há número fixo de consultas. Só barramos uso automatizado ou fora do normal, como dezenas de consultas na mesma hora."],
  ["Os preços de passagem são garantidos?", "Não. São preços de referência, com a data da cotação, para orientar o cliente. A compra é feita no site do parceiro."],
];

export default async function AgenciasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let nomeAtual: string | null = null;
  if (user) {
    const { data: org } = await supabase.rpc("minha_organizacao");
    if (org) nomeAtual = (await supabase.from("organizacoes").select("nome").eq("id", org).maybeSingle()).data?.nome ?? null;
  }
  // Página pública: se a leitura dos preços falhar, mostra os preços padrão
  const precos = await (async () => lerConfig<Record<string, number>>(createAdminClient(), "precos_produtos", {}))().catch(
    () => ({}) as Record<string, number>,
  );

  const planos = [
    {
      id: "basic" as const,
      titulo: "Compass Basic",
      preco: formatarPreco(precos.basic ?? 199.9),
      resumo: "Para agências que montam algumas viagens por semana.",
      itens: [
        "30 consultas completas por mês (roteiro, passagens e hotéis)",
        "3 ajustes incluídos em cada consulta",
        "PDF com logo, cores e contato da agência",
        "Equipe de até 20 pessoas na mesma conta",
        "Sem limite diário de consultas",
        "Suporte pelo WhatsApp",
      ],
    },
    {
      id: "premium" as const,
      titulo: "Compass Premium",
      preco: formatarPreco(precos.premium ?? 399.9),
      resumo: "Para operações com volume: consultas sem número fixo.",
      destaque: true,
      itens: [
        "Consultas completas sem número fixo (uso justo)",
        "Tudo do Basic",
        "Prioridade no suporte pelo WhatsApp",
        "Roteiros assinados para adaptar aos seus clientes",
      ],
    },
  ];

  return (
    <div className="bg-bg text-text">
      <SiteHeader />
      <main>
        <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-16 pb-10 sm:px-6">
          <p className="text-sm font-medium text-accent-strong">Compass para agências</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Roteiros que seus clientes não acham sozinhos, com a sua marca
          </h1>
          <p className="max-w-2xl text-lg text-text-2">
            O mesmo método de quem já rodou 4 continentes, 14 países e mais de 70 cidades: entra por uma cidade, sai por outra e
            nunca volta pelo mesmo caminho. Pronto para você entregar.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFICIOS.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
                <Icone className="size-5 text-accent-strong" aria-hidden />
                <p className="font-medium">{titulo}</p>
                <p className="text-sm text-text-2">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="planos" className="mx-auto max-w-4xl scroll-mt-20 px-4 pb-16 sm:px-6">
          <h2 className="mb-6 text-3xl font-semibold tracking-tight">Planos</h2>
          <AssinarAgencia planos={planos} logado={!!user} nomeAtual={nomeAtual} />
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Dúvidas sobre os planos</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {PERGUNTAS.map(([p, r]) => (
              <details key={p} className="group p-5">
                <summary className="cursor-pointer list-none font-medium marker:hidden">{p}</summary>
                <p className="mt-2 text-text-2">{r}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Rodape creditos={[]} />
    </div>
  );
}
