import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { WhatsAppTemplateEditor } from "@/components/communication/whatsapp-template-editor";

export const metadata: Metadata = { title: "Templates WhatsApp" };

export default async function WhatsAppTemplatesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const templates = await prisma.whatsAppTemplate.findMany({
    where: { tenantId },
    select: { id: true, event: true, bodyTemplate: true, isActive: true },
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/comunicacao"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-500" />
            Templates WhatsApp
          </h1>
          <p className="text-xs text-navy-400">
            Configure o texto de cada evento. Use <code className="bg-navy-50 px-1 rounded">{`{{placeholder}}`}</code> para dados dinâmicos.
          </p>
        </div>
      </div>

      {!process.env.DIGISAC_TOKEN && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Atenção:</strong> <code>DIGISAC_TOKEN</code> e <code>DIGISAC_SUBDOMAIN</code> não configurados —
          as mensagens serão salvas mas <strong>não enviadas</strong> até as variáveis de ambiente estarem presentes.
        </div>
      )}

      <WhatsAppTemplateEditor initial={templates} />
    </div>
  );
}
