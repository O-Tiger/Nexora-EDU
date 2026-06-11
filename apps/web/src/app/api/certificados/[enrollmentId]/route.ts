import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { prisma } from "@nexora/db";
import {
  checkCourseCompletion,
  generateCertificatePdf,
  getOrCreateCertificate,
  getCertificateTemplate,
} from "@/lib/certificate";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function GET(_req: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, userId: session.user.id, tenantId: session.user.activeTenantId },
    include: { course: { select: { id: true, title: true, hoursTotal: true } } },
  });

  if (!enrollment) return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });

  const completed = await checkCourseCompletion(
    session.user.id,
    enrollment.courseId,
    session.user.activeTenantId,
  );
  if (!completed) {
    return NextResponse.json({ error: "Curso ainda não concluído" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const certificate = await getOrCreateCertificate(
    session.user.id,
    enrollment.courseId,
    session.user.activeTenantId,
    enrollmentId,
  );

  // Se já tem PDF no R2, retornar presigned URL
  if (certificate.pdfKey) {
    try {
      const url = await getPresignedDownloadUrl(certificate.pdfKey);
      return NextResponse.json({ url, code: certificate.code });
    } catch (e) {
      console.error("[certificado.GET] Erro ao gerar URL do PDF existente:", e);
    }
  }

  // Gerar PDF, fazer upload para R2 e salvar a chave
  try {
    const fallbackInstitution = session.user.activeTenantId === "inst_a" ? "Faculdade Nexora" : "Colégio Nexora";
    const template = await getCertificateTemplate(session.user.activeTenantId, fallbackInstitution);
    const pdfBuffer = await generateCertificatePdf({
      studentName: user.name,
      courseName: enrollment.course.title,
      hoursTotal: enrollment.course.hoursTotal,
      issuedAt: certificate.issuedAt,
      code: certificate.code,
      institutionName: template.institutionName,
      studentCpf: user.cpf,
    }, template);

    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY;
    const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET ?? "nexora-edu";

    if (accountId && accessKey && secretKey) {
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      });

      const pdfKey = `${session.user.activeTenantId}/certificados/${certificate.code}.pdf`;

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      }));

      await prisma.certificate.update({ where: { id: certificate.id }, data: { pdfKey } });

      const url = await getPresignedDownloadUrl(pdfKey);
      return NextResponse.json({ url, code: certificate.code });
    }

    // Sem R2 configurado: retornar o PDF inline (apenas em dev)
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-${certificate.code}.pdf"`,
      },
    });
  } catch (e) {
    console.error("[certificado.GET] Erro ao gerar PDF:", e);
    return NextResponse.json({ error: "Não foi possível gerar o certificado" }, { status: 500 });
  }
}
