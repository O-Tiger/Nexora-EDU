import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { prisma } from "@nexora/db";
import { getCertificateTemplate } from "@/lib/certificate";
import { CertificateTemplateEditor } from "@/components/admin/certificate-template-editor";

export const metadata: Metadata = { title: "Certificados" };

export default async function CertificadosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") redirect("/unauthorized");

  const fallback = activeTenantId === "inst_a" ? "Faculdade Nexora" : "Colégio Nexora";
  const [tpl, issuedCount] = await Promise.all([
    getCertificateTemplate(activeTenantId, fallback),
    prisma.certificate.count({ where: { tenantId: activeTenantId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <Award className="h-6 w-6 text-teal-500" />
          Certificados
        </h1>
        <p className="text-sm text-navy-500">
          Personalize o modelo de certificado. {issuedCount} certificado{issuedCount !== 1 ? "s" : ""} emitido{issuedCount !== 1 ? "s" : ""}.
          O aluno baixa o PDF ao concluir 100% do curso.
        </p>
      </div>

      <CertificateTemplateEditor
        initial={{
          institutionName: tpl.institutionName,
          subtitle: tpl.subtitle ?? "",
          title: tpl.title,
          bodyTemplate: tpl.bodyTemplate,
          signatures: tpl.signatures.length > 0 ? tpl.signatures : [{ name: "", role: "Diretor(a) Geral" }],
          logoUrl: tpl.logoUrl ?? "",
          city: tpl.city ?? "",
          accentColor: tpl.accentColor,
        }}
      />
    </div>
  );
}
