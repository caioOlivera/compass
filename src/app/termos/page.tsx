import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { EMPRESA } from "@/lib/empresa";

export const metadata: Metadata = { title: "Termos de Uso — Compass" };

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <p>
        Estes termos regem o uso da {EMPRESA.nome}, operada por {EMPRESA.razaoSocial} (CNPJ {EMPRESA.cnpj}). Ao criar uma conta, você
        concorda com eles e com a{" "}
        <Link href="/privacidade" className="text-accent-strong underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <h2>1. O que é o serviço</h2>
      <p>
        A {EMPRESA.nome} monta roteiros de viagem com apoio de inteligência artificial e de relatos de viagens reais. Não somos agência
        de turismo, companhia aérea nem hotel: não vendemos passagens nem hospedagens. Preços de passagens e hotéis são referências
        consultadas em parceiros, com a data da consulta, e podem mudar até a compra, que é feita no site do parceiro.
      </p>

      <h2>2. Conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e informar dados verdadeiros.</li>
        <li>A conta é pessoal; não compartilhe a senha. Contas de agência têm dono e membros convidados por ele.</li>
        <li>Toda conta nova ganha um roteiro grátis, sem passagens e hotéis, uma vez por pessoa.</li>
      </ul>

      <h2>3. Produtos e créditos</h2>
      <ul>
        <li>Roteiro, roteiro assinado, completo e consultoria são vendidos como créditos, válidos por 12 meses.</li>
        <li>Cada consulta inclui 3 ajustes; depois disso, um novo ajuste consome um novo crédito do mesmo tipo.</li>
        <li>No Completo, passagens e hotéis vêm junto do roteiro e são atualizados 1 vez por dia durante 15 dias.</li>
        <li>Planos de agência são cobrados todo mês e podem ser cancelados a qualquer momento; o plano vale até o fim do mês pago.</li>
      </ul>

      <h2>4. Reembolso e arrependimento</h2>
      <p>
        Você pode desistir da compra em até 7 dias (Código de Defesa do Consumidor, art. 49) enquanto o crédito não tiver sido usado. O
        roteiro é conteúdo digital entregue na hora em que é gerado: ao gerar, você recebe o produto completo e o crédito deixa de ser
        reembolsável. Você confirma estar ciente disso antes de pagar. Na consultoria, o reembolso vale até o consultor começar o
        atendimento. Se a geração falhar, o crédito volta para a sua conta automaticamente.
      </p>

      <h2>5. Uso permitido</h2>
      <ul>
        <li>Não é permitido revender roteiros como produto próprio, exceto agências com plano ativo para os seus clientes.</li>
        <li>Não é permitido automatizar consultas, contornar limites ou tentar acessar dados de outras pessoas.</li>
        <li>Podemos suspender contas que violem estes termos, avisando o motivo.</li>
      </ul>

      <h2>6. Responsabilidade</h2>
      <p>
        O roteiro é uma sugestão. Horários, regras de entrada, vistos, vacinas, clima e preços mudam: confira nas fontes oficiais antes
        de viajar e comprar. Não respondemos por atos de companhias aéreas, hotéis e outros fornecedores escolhidos por você.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        A marca, o site, o método e os roteiros assinados são da {EMPRESA.nome}. O roteiro gerado para você é seu para uso pessoal (ou
        para os clientes da sua agência, com plano ativo).
      </p>

      <h2>8. Mudanças e foro</h2>
      <p>
        Podemos atualizar estes termos; mudanças relevantes são avisadas antes de valer. Fica eleito o foro do domicílio do consumidor
        ou, para agências, o de {EMPRESA.foro}.
      </p>
    </PaginaLegal>
  );
}
