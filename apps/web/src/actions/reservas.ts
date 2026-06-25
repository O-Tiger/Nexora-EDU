"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@nexora/db";
import { ReservaVagaSchema, CancelarReservaSchema, getProximaEtapaAno, buildTurmaCode } from "@nexora/validators";
import { createReserva, updateReservaStatus, getReservaByStudent } from "@nexora/db/src/queries/reservas";
import { upsertMensalidade } from "@nexora/db/src/queries/financeiro";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import { syncMensalidadeToOmie } from "../lib/omie";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

// ─── CRIAR RESERVA ────────────────────────────────────────────────────────────

export async function createReservaAction(rawData: unknown) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = ReservaVagaSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const { studentId, anoLetivoAtualId, turmaAtualId, proximoAnoLetivoId, taxaReservaCents, vencimentoDia, entrevistaAt, notes } = parsed.data;

  // Bloqueia reserva duplicada
  const existente = await getReservaByStudent(tenantId, studentId, anoLetivoAtualId);
  if (existente) return { error: "Este aluno já possui uma reserva para este ano letivo" };

  // Busca turma atual + aluno
  const [turmaAtual, student, proximoAnoLetivo] = await Promise.all([
    prisma.turma.findFirst({ where: { id: turmaAtualId, tenantId }, include: { unidade: true } }),
    prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, email: true, cpf: true, phone: true } }),
    prisma.anoLetivo.findFirst({ where: { id: proximoAnoLetivoId, tenantId } }),
  ]);

  if (!turmaAtual) return { error: "Turma atual não encontrada" };
  if (!student) return { error: "Aluno não encontrado" };
  if (!proximoAnoLetivo) return { error: "Próximo ano letivo não encontrado" };

  // Calcula próxima etapa/ano
  const proxima = getProximaEtapaAno(turmaAtual.etapa, turmaAtual.ano);
  if (!proxima) return { error: "Aluno está no último ano do Ensino Médio — não é possível criar reserva" };

  // Determina prefixo para a turma do próximo ano
  let proximoPrefix: string;
  if (proxima.etapa === turmaAtual.etapa) {
    // Mesma etapa — usa o mesmo prefixo
    proximoPrefix = turmaAtual.etapaPrefix ?? turmaAtual.etapa;
  } else {
    // Mudança de etapa — busca prefixo em turmas existentes da nova etapa no mesmo tenant
    const turmaReferencia = await prisma.turma.findFirst({
      where: { tenantId, etapa: proxima.etapa, etapaPrefix: { not: null } },
      select: { etapaPrefix: true },
    });
    proximoPrefix = turmaReferencia?.etapaPrefix ?? proxima.etapa;
  }

  // Código da nova turma
  const novoCode = buildTurmaCode({
    etapaPrefix: proximoPrefix,
    ano: proxima.ano,
    letra: turmaAtual.letra,
    unidadeCode: turmaAtual.unidade.code,
  });

  // Busca ou cria turma do próximo ano letivo
  let turmaProxima = await prisma.turma.findUnique({
    where: { tenantId_anoLetivoId_code: { tenantId, anoLetivoId: proximoAnoLetivoId, code: novoCode } },
  });

  if (!turmaProxima) {
    turmaProxima = await prisma.turma.create({
      data: {
        tenantId,
        unidadeId: turmaAtual.unidadeId,
        anoLetivoId: proximoAnoLetivoId,
        code: novoCode,
        etapa: proxima.etapa,
        ano: proxima.ano,
        letra: turmaAtual.letra,
        periodo: turmaAtual.periodo,
        maxStudents: turmaAtual.maxStudents,
        etapaPrefix: proximoPrefix,
      },
    });

    // Herda disciplinas (sem professores nem horário)
    const disciplinasAtuais = await prisma.turmaDisciplina.findMany({
      where: { turmaId: turmaAtualId },
      select: { disciplinaId: true },
    });

    if (disciplinasAtuais.length > 0) {
      await prisma.turmaDisciplina.createMany({
        data: disciplinasAtuais.map((d) => ({
          tenantId,
          turmaId: turmaProxima!.id,
          disciplinaId: d.disciplinaId,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Cria a taxa de reserva como Mensalidade tipo TAXA_RESERVA
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;
  const vencimento = new Date(anoAtual, mesAtual - 1, vencimentoDia);
  if (vencimento < new Date()) vencimento.setMonth(vencimento.getMonth() + 1);

  // Busca ou cria PlanoCobranca dummy para taxa de reserva (reutiliza o mesmo por tenant/ano)
  let planoTaxa = await prisma.planoCobranca.findFirst({
    where: { tenantId, anoLetivoId: anoLetivoAtualId, nome: "Taxa de Reserva de Vaga" },
  });
  if (!planoTaxa) {
    planoTaxa = await prisma.planoCobranca.create({
      data: {
        tenantId,
        anoLetivoId: anoLetivoAtualId,
        nome: "Taxa de Reserva de Vaga",
        valorCents: taxaReservaCents,
        vencimentoDia,
        meses: [mesAtual],
        ativo: true,
      },
    });
  }

  const mensalidade = await upsertMensalidade(tenantId, {
    studentId,
    planoId: planoTaxa.id,
    anoLetivoId: anoLetivoAtualId,
    mes: vencimento.getMonth() + 1,
    ano: anoAtual,
    valorCents: taxaReservaCents,
    vencimento,
  });

  // Atualiza tipo para TAXA_RESERVA
  await prisma.mensalidade.update({ where: { id: mensalidade.id }, data: { tipo: "TAXA_RESERVA" } });

  // Cria a reserva
  const reserva = await createReserva({
    tenantId,
    studentId,
    anoLetivoAtualId,
    turmaAtualId,
    turmaProximaId: turmaProxima.id,
    mensalidadeId: mensalidade.id,
    ...(entrevistaAt && { entrevistaAt }),
    ...(notes && { notes }),
    createdBy: userId,
  });

  // Sync Omie fire-and-forget
  void syncMensalidadeToOmie({
    mensalidadeId: mensalidade.id,
    userId: student.id,
    userName: student.name,
    userEmail: student.email,
    userCpf: student.cpf,
    userPhone: student.phone,
    valorCents: taxaReservaCents,
    vencimento,
    descricao: `Taxa de Reserva de Vaga — ${novoCode} (${proximoAnoLetivo.year})`,
  });

  await createAuditLog(tenantId, userId, "reserva.created", `reserva:${reserva.id}`, {
    student: student.name, turmaProxima: novoCode,
  });

  revalidatePath("/admin/secretaria/reservas");
  return { success: true, turmaProximaCode: novoCode, turmaCriada: !turmaProxima };
}

// ─── CONFIRMAR MATRÍCULA ──────────────────────────────────────────────────────

export async function confirmarReservaAction(reservaId: string) {
  const { tenantId, userId } = await requireAdmin();

  const reserva = await prisma.reservaVaga.findFirst({
    where: { id: reservaId, tenantId },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!reserva) return { error: "Reserva não encontrada" };
  if (reserva.status !== "PAGA") return { error: "A taxa de reserva ainda não foi confirmada como paga" };

  // Cria TurmaEnrollment no próximo ano letivo
  const turmaProxima = await prisma.turma.findUnique({ where: { id: reserva.turmaProximaId } });
  if (!turmaProxima) return { error: "Turma do próximo ano não encontrada" };

  const enrollmentExistente = await prisma.turmaEnrollment.findUnique({
    where: { studentId_anoLetivoId: { studentId: reserva.studentId, anoLetivoId: turmaProxima.anoLetivoId } },
  });
  if (enrollmentExistente) return { error: "Aluno já está matriculado no próximo ano letivo" };

  await prisma.$transaction([
    prisma.turmaEnrollment.create({
      data: {
        tenantId,
        studentId: reserva.studentId,
        turmaId: reserva.turmaProximaId,
        anoLetivoId: turmaProxima.anoLetivoId,
        status: "ATIVA",
      },
    }),
    prisma.reservaVaga.update({
      where: { id: reservaId },
      data: { status: "CONFIRMADA", confirmedAt: new Date() },
    }),
  ]);

  await createAuditLog(tenantId, userId, "reserva.confirmada", `reserva:${reservaId}`, { student: reserva.student.name });
  revalidatePath("/admin/secretaria/reservas");
  return { success: true };
}

// ─── CANCELAR RESERVA ─────────────────────────────────────────────────────────

export async function cancelarReservaAction(reservaId: string, rawData: unknown) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = CancelarReservaSchema.safeParse(rawData);
  if (!parsed.success) return { error: "Motivo de cancelamento obrigatório (mín. 5 caracteres)" };

  const reserva = await prisma.reservaVaga.findFirst({ where: { id: reservaId, tenantId } });
  if (!reserva) return { error: "Reserva não encontrada" };
  if (reserva.status === "CONFIRMADA") return { error: "Reservas confirmadas não podem ser canceladas" };

  await updateReservaStatus(tenantId, reservaId, {
    status: "CANCELADA",
    cancelledAt: new Date(),
    cancelReason: parsed.data.cancelReason,
  });

  await createAuditLog(tenantId, userId, "reserva.cancelada", `reserva:${reservaId}`, { motivo: parsed.data.cancelReason });
  revalidatePath("/admin/secretaria/reservas");
  return { success: true };
}
