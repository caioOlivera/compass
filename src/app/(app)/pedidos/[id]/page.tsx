import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { NOME_STATUS_PEDIDO, PRODUTOS, type ProdutoAvulso } from "@/lib/creditos";
import { formatarPreco } from "@/lib/motor/catalogo";
import { mercadoPagoConfigurado } from "@/lib/pagamentos/mercadopago";
import { processarPagamento } from "@/lib/pagamentos/processar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seu pedido — Compass" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ payment_id?: string; collection_id?: string }> };

export default async function PedidoPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/pedidos/${id}`);

  const ler = () => supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
  let { data: pedido } = await ler();
  if (!pedido || pedido.user_id !== user.id) notFound();

  // Volta do Checkout antes do aviso do webhook: confere o pagamento direto na API.
  // O pagamento só vale para este pedido se a external_reference bater (processarPagamento confere).
  const pagamentoId = sp.payment_id ?? sp.collection_id;
  if (pedido.status === "pendente" && pagamentoId && /^\d+$/.test(pagamentoId) && mercadoPagoConfigurado()) {
    try {
      await processarPagamento(createAdminClient(), pagamentoId);
      ({ data: pedido } = await ler());
    } catch (e) {
      console.error("[pedido] conferir pagamento", e);
    }
  }
  if (!pedido) notFound();

  const produto = pedido.produto as ProdutoAvulso;
  const ref = (pedido.referencia ?? {}) as { roteiro_base_id?: string };
  const { data: consultoria } =
    produto === "consultoria" ? await supabase.from("consultorias").select("id").eq("pedido_id", id).maybeSingle() : { data: null };

  const proximo =
    pedido.status !== "pago"
      ? null
      : produto === "assinado" && ref.roteiro_base_id
        ? { href: `/roteiros-assinados/${ref.roteiro_base_id}`, rotulo: "Adaptar o roteiro assinado" }
        : produto === "assinado"
          ? { href: "/roteiros-assinados", rotulo: "Escolher o roteiro assinado" }
          : produto === "consultoria" && consultoria
            ? { href: `/consultoria/${consultoria.id}`, rotulo: "Preencher o briefing" }
            : { href: "/nova-viagem", rotulo: "Montar meu roteiro" };

  const Icone = pedido.status === "pago" ? CheckCircle2 : pedido.status === "pendente" ? Clock : XCircle;

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-6">
          <Icone className={pedido.status === "pago" ? "size-8 text-accent-strong" : "size-8 text-text-2"} aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">
            {pedido.status === "pago" ? "Pagamento confirmado" : pedido.status === "pendente" ? "Aguardando o pagamento" : NOME_STATUS_PEDIDO[pedido.status]}
          </h1>
          <p className="text-text-2">
            {PRODUTOS[produto]?.titulo ?? pedido.produto} · {formatarPreco(Number(pedido.valor))}
          </p>
          {pedido.status === "pendente" && (
            <p className="text-sm text-text-2">
              No Pix, a confirmação costuma levar alguns segundos. Recarregue esta página depois de pagar; o crédito entra
              sozinho.
            </p>
          )}
          {proximo && (
            <Link href={proximo.href} className="inline-flex h-11 items-center rounded-lg bg-accent px-5 text-sm font-medium text-accent-contrast hover:opacity-90">
              {proximo.rotulo}
            </Link>
          )}
          {(pedido.status === "cancelado" || pedido.status === "expirado") && (
            <Link href={`/comprar?produto=${produto}`} className="text-sm font-medium text-accent-strong hover:underline">
              Tentar de novo
            </Link>
          )}
        </div>
        <Link href="/perfil" className="text-sm text-text-2 hover:text-text">
          Ver meus créditos e pedidos
        </Link>
      </main>
    </>
  );
}
