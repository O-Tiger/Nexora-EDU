import { NextResponse } from "next/server";
import {
  getOverdueEnrollments,
  getExpiringEnrollmentsInDays,
  expireEnrollment,
} from "@nexora/db/src/queries/enrollments-admin";

// Este endpoint deve ser chamado diariamente.
// Railway: configurar um cron job apontando para /api/cron/enrollments
// Autenticação: CRON_SECRET para impedir chamadas não autorizadas
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    // 1. Expirar matrículas vencidas
    const overdue = await getOverdueEnrollments();
    for (const enrollment of overdue) {
      await expireEnrollment(enrollment.id);
    }

    // 2. Buscar matrículas que expiram nos próximos 7 dias (para aviso por email/WhatsApp)
    const expiringSoon = await getExpiringEnrollmentsInDays(7);

    // TODO(fase-2): enviar email e WhatsApp de aviso para cada aluno em expiringSoon
    // await sendExpiryWarningEmails(expiringSoon)
    // await sendExpiryWarningWhatsApp(expiringSoon)

    return NextResponse.json({
      expired: overdue.length,
      warned: expiringSoon.length,
    });
  } catch (e) {
    console.error("[cron.enrollments] Erro:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
