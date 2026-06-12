import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { prisma } from "@nexora/db";
import { Button, BRAND } from "@nexora/ui";
import { ShieldCheck } from "lucide-react";
import { acceptConsentAction } from "@/actions/lgpd";

export const metadata: Metadata = { title: "Termos e Privacidade" };

export default async function ConsentPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // If already consented, skip this page
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { consentedAt: true },
  });
  if (user?.consentedAt) redirect("/aluno");

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-navy-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full bg-teal-50 p-3">
            <ShieldCheck className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">Termos de Uso e Privacidade</h1>
          <p className="mt-1 text-sm text-navy-500">{BRAND.name} · Conforme a LGPD (Lei nº 13.709/2018)</p>
        </div>

        <div className="mb-6 h-64 overflow-y-auto rounded-lg border border-navy-100 bg-navy-50 p-4 text-xs text-navy-600 space-y-3">
          <p><strong>1. Dados coletados</strong><br />
          Coletamos nome, e-mail, CPF (opcional), telefone (opcional) e dados de uso da plataforma (progresso, avaliações, mensagens) estritamente para prestação do serviço educacional.</p>

          <p><strong>2. Finalidade</strong><br />
          Os dados são usados para: gerenciar sua matrícula, emitir certificados, enviar notificações relacionadas ao curso e cumprir obrigações legais.</p>

          <p><strong>3. Compartilhamento</strong><br />
          Seus dados não são vendidos. Podem ser compartilhados com fornecedores operacionais (armazenamento em nuvem, sistema ERP financeiro) sob contrato de processamento de dados.</p>

          <p><strong>4. Seus direitos (LGPD art. 18)</strong><br />
          Você pode a qualquer momento: acessar seus dados, corrigir informações, solicitar portabilidade (exportação JSON) e solicitar a exclusão da sua conta pela página &ldquo;Meus Dados&rdquo;.</p>

          <p><strong>5. Retenção</strong><br />
          Dados são mantidos pelo período da matrícula e pelo prazo legal após o encerramento. Após solicitação de exclusão, os dados são anonimizados imediatamente.</p>

          <p><strong>6. Contato</strong><br />
          Para exercer seus direitos ou tirar dúvidas: {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "suporte@nexora.edu"}</p>
        </div>

        <form action={acceptConsentAction}>
          <Button type="submit" className="w-full" size="lg">
            Li e aceito os Termos de Uso e a Política de Privacidade
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-navy-400">
          Ao aceitar, você consente com o tratamento de dados descrito acima. Você pode revogar este consentimento a qualquer momento em &ldquo;Meus Dados&rdquo;.
        </p>
      </div>
    </div>
  );
}
