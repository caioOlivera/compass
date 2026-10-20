import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { EMPRESA } from "@/lib/empresa";

export const metadata: Metadata = { title: "Política de Privacidade — Compass" };

const OPERADORES = [
  ["Supabase", "Banco de dados, contas e arquivos", "EUA (Virgínia)"],
  ["Vercel", "Hospedagem do site e registros de acesso", "EUA"],
  ["Google (Gemini)", "Inteligência artificial que monta o roteiro (recebe as respostas do questionário, sem nome, e-mail ou telefone)", "EUA"],
  ["Mercado Pago", "Pagamentos por Pix e cartão", "Brasil"],
  ["Resend", "Envio de e-mails do suporte (quando ativado)", "EUA"],
  ["Travelpayouts", "Links de afiliado de passagens e hotéis; cookies de afiliado só com o seu aceite", "Holanda e outros"],
  ["SerpApi", "Consulta de preços de hotel e voo (recebe só cidade, datas e número de pessoas)", "EUA"],
  ["Unsplash e Pexels", "Fotos dos destinos (não recebem dados pessoais)", "EUA e Alemanha"],
  ["OpenFreeMap", "Mapa (recebe o endereço IP ao carregar o mapa)", "União Europeia"],
];

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade">
      <p>
        Esta política explica quais dados pessoais a {EMPRESA.nome} trata, por que, com quem compartilha e como você exerce os seus
        direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
      </p>

      <h2>1. Quem é o controlador</h2>
      <p>
        {EMPRESA.razaoSocial}, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}. Canal do encarregado e de pedidos sobre seus dados:{" "}
        <strong>{EMPRESA.emailPrivacidade}</strong> ou pela página{" "}
        <Link href="/ajuda" className="text-accent-strong underline">
          Ajuda
        </Link>
        .
      </p>

      <h2>2. Que dados tratamos e para quê</h2>
      <table>
        <thead>
          <tr>
            <th>Dados</th>
            <th>Para quê</th>
            <th>Base legal (LGPD art. 7º)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nome, e-mail, telefone, senha (guardada cifrada), foto de perfil</td>
            <td>Criar e manter a sua conta, falar com você</td>
            <td>Execução de contrato (V)</td>
          </tr>
          <tr>
            <td>Respostas do questionário (destinos, datas, cidade de saída, quem viaja, orçamento, interesses, observações) e os roteiros gerados</td>
            <td>Montar, guardar e ajustar os seus roteiros; cotar passagens e hotéis no produto Completo</td>
            <td>Execução de contrato (V)</td>
          </tr>
          <tr>
            <td>Pedidos, valores, forma de pagamento, créditos</td>
            <td>Cobrar, liberar créditos, reembolsar e cumprir obrigações fiscais</td>
            <td>Execução de contrato (V) e obrigação legal (II)</td>
          </tr>
          <tr>
            <td>Briefing da consultoria e mensagens de suporte</td>
            <td>Prestar a consultoria e responder chamados</td>
            <td>Execução de contrato (V)</td>
          </tr>
          <tr>
            <td>Dados da agência (nome, logo, cores, contato, equipe)</td>
            <td>Aplicar a marca no PDF e dar acesso à equipe</td>
            <td>Execução de contrato (V)</td>
          </tr>
          <tr>
            <td>Registros de acesso (IP, data e hora, páginas)</td>
            <td>Segurança, prevenção de fraude e obrigação do Marco Civil da Internet</td>
            <td>Obrigação legal (II) e legítimo interesse (IX)</td>
          </tr>
          <tr>
            <td>Uso do produto (quantas consultas, custo de cada uma)</td>
            <td>Medir custos e melhorar o serviço</td>
            <td>Legítimo interesse (IX)</td>
          </tr>
          <tr>
            <td>Cookies de afiliado de parceiros de viagem</td>
            <td>Receber comissão quando você compra pelos nossos links</td>
            <td>Consentimento (I), que você pode retirar a qualquer momento</td>
          </tr>
        </tbody>
      </table>
      <p>Não vendemos dados pessoais e não pedimos dados sensíveis. Não use as observações para informar dados de saúde ou documentos.</p>

      <h2>3. Inteligência artificial</h2>
      <p>
        O roteiro é montado por inteligência artificial a partir das suas respostas. Enviamos ao provedor de IA só o conteúdo do
        questionário, sem o seu nome, e-mail ou telefone. O resultado é uma sugestão: confira horários, preços e regras antes de
        comprar. Você pode pedir revisão por uma pessoa pelo suporte.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Com empresas que operam partes do serviço em nosso nome, cada uma só com o necessário:</p>
      <table>
        <thead>
          <tr>
            <th>Empresa</th>
            <th>O que faz</th>
            <th>Onde</th>
          </tr>
        </thead>
        <tbody>
          {OPERADORES.map(([e, o, l]) => (
            <tr key={e}>
              <td>{e}</td>
              <td>{o}</td>
              <td>{l}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Também podemos compartilhar dados com autoridades quando a lei exigir. Se você usa a conta de uma agência, o dono da agência
        vê o seu nome e os roteiros feitos pela equipe.
      </p>

      <h2>5. Transferência internacional</h2>
      <p>
        Parte dos operadores guarda dados fora do Brasil, principalmente nos EUA. A transferência se apoia nas cláusulas contratuais
        desses fornecedores e nas garantias do art. 33 da LGPD, e só acontece para prestar o serviço que você contratou.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>Conta, roteiros e créditos: enquanto a conta existir. Ao excluir a conta, apagamos em até 15 dias.</li>
        <li>Pedidos e pagamentos: 5 anos depois da compra, por obrigação fiscal. Se você excluir a conta, guardamos só o comprovante, sem seu nome ou e-mail.</li>
        <li>Registros de acesso: 6 meses (Marco Civil da Internet).</li>
        <li>Mensagens de suporte: 2 anos depois do último contato.</li>
        <li>Cotações de passagens e hotéis (sem dados pessoais): até 30 dias.</li>
      </ul>

      <h2>7. Seus direitos</h2>
      <p>Pela LGPD (art. 18), você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessá-los;</li>
        <li>corrigir dados incompletos ou errados (no seu perfil);</li>
        <li>receber uma cópia dos seus dados (botão “Baixar meus dados” no perfil);</li>
        <li>excluir a sua conta e os dados ligados a ela (botão “Excluir minha conta” no perfil), salvo o que a lei manda guardar;</li>
        <li>saber com quem compartilhamos (seção 4) e retirar o consentimento dos cookies de afiliado;</li>
        <li>pedir revisão de decisões automatizadas e reclamar à ANPD (gov.br/anpd).</li>
      </ul>
      <p>Respondemos pedidos em até 15 dias pelo canal da seção 1.</p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexão cifrada (HTTPS), senhas guardadas com hash pelo provedor de autenticação, controle de acesso por linha no banco
        (cada pessoa só lê os próprios dados), chaves de serviço só no servidor e acesso administrativo restrito. Se acontecer um
        incidente que possa causar risco ou dano relevante, avisamos você e a ANPD nos prazos da regulamentação.
      </p>

      <h2 id="cookies" className="scroll-mt-24">9. Cookies</h2>
      <p>
        Usamos cookies essenciais para manter você conectado e lembrar o rascunho do questionário no seu navegador. Os cookies de
        afiliado de parceiros só são usados se você aceitar no aviso de cookies; você pode mudar a escolha em “Preferências de
        cookies”, no rodapé.
      </p>

      <h2>10. Crianças e adolescentes</h2>
      <p>O serviço é para maiores de 18 anos. Dados de crianças só entram como número de crianças na viagem, informado pelo responsável.</p>

      <h2>11. Mudanças</h2>
      <p>Se esta política mudar de forma relevante, avisamos no site ou por e-mail antes de a mudança valer.</p>
    </PaginaLegal>
  );
}
