import type { Metadata } from "next";
import { prisma } from "@nexora/db";
import { notFound } from "next/navigation";
import { Badge } from "@nexora/ui";
import { CheckCircle } from "lucide-react";
import { BRAND } from "@nexora/ui";

export const metadata: Metadata = { title: "Validação de Certificado" };

const tenantNames: Record<string, string> = {
  inst_a: "Faculdade Nexora",
  inst_b: "Colégio Nexora",
};

export default async function CertificateValidationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const cert = await prisma.certificate.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      // Buscar dados via joins manuais — sem relações declaradas no schema ainda
    },
  });

  // Buscar manualmente user e course
  const certificate = await prisma.certificate.findUnique({ where: { code: code.toUpperCase() } });
  if (!certificate) notFound();

  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: certificate.userId }, select: { name: true } }),
    prisma.course.findUnique({ where: { id: certificate.courseId }, select: { title: true, hoursTotal: true } }),
  ]);

  if (!user || !course) notFound();

  const issuedAt = certificate.issuedAt.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4 py-12">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div>
          <Badge variant="success" className="mb-3">Certificado válido</Badge>
          <h1 className="text-2xl font-bold text-navy-900">Certificado autêntico</h1>
          <p className="mt-1 text-navy-500">
            Este certificado foi emitido por {BRAND.name} e é autêntico.
          </p>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-6 text-left space-y-3">
          <Row label="Aluno" value={user.name} />
          <Row label="Curso" value={course.title} />
          <Row label="Carga horária" value={`${course.hoursTotal}h`} />
          <Row label="Instituição" value={tenantNames[certificate.tenantId] ?? certificate.tenantId} />
          <Row label="Emitido em" value={issuedAt} />
          <Row label="Código" value={certificate.code} mono />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-navy-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-navy-900 text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
