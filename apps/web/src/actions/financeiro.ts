"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@nexora/db";
import { PlanoCobrancaSchema, GerarMensalidadesSchema, UpdateMensalidadeSchema } from "@nexora/validators";
import {
  createPlanoCobranca, updatePlanoCobranca, deletePlanoCobranca,
  upsertMensalidade, updateMensalidadeStatus,
  markVencidas,
} from "@nexora/db/src/queries/financeiro";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import { syncMensalidadeToOmie } from "../lib/omie";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

// ─── PLANOS ───────────────────────────────────────────────────────────────────

export async function createPlanoCobrancaAction(formData: FormData) {
  const { tenantId, userId } = await requireAdmin();

  const mesesRaw = formData.get("meses");
  const parsed = PlanoCobrancaSchema.safeParse({
    anoLetivoId: formData.get("anoLetivoId"),
    turmaId: formData.get("turmaId") || undefined,
    nome: formData.get("nome"),
    valorCents: Number(formData.get("valorCents")),
    vencimentoDia: Number(formData.get("vencimentoDia")),
    meses: mesesRaw ? JSON.parse(String(mesesRaw)) : [],
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const plano = await createPlanoCobranca(tenantId, {
    ...parsed.data,
    turmaId: parsed.data.turmaId ?? null,
  });
  await createAuditLog(tenantId, userId, "financeiro.plano_created", `plano:${plano.id}`, { nome: plano.nome });
  revalidatePath("/admin/secretaria/financeiro");
  return { success: true };
}

export async function updatePlanoCobrancaAction(id: string, formData: FormData) {
  const { tenantId } = await requireAdmin();

  const mesesRaw = formData.get("meses");
  const data: Record<string, unknown> = {};
  if (formData.get("nome")) data.nome = formData.get("nome");
  if (formData.get("valorCents")) data.valorCents = Number(formData.get("valorCents"));
  if (formData.get("vencimentoDia")) data.vencimentoDia = Number(formData.get("vencimentoDia"));
  if (mesesRaw) data.meses = JSON.parse(String(mesesRaw));

  await updatePlanoCobranca(tenantId, id, data);
  revalidatePath("/admin/secretaria/financeiro");
  return { success: true };
}

export async function deletePlanoCobrancaAction(id: string) {
  const { tenantId } = await requireAdmin();
  try {
    await deletePlanoCobranca(tenantId, id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao excluir plano" };
  }
  revalidatePath("/admin/secretaria/financeiro");
  return { success: true };
}

// ─── GERAR MENSALIDADES ───────────────────────────────────────────────────────

export async function gerarMensalidadesAction(rawPlanoId: unknown) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = GerarMensalidadesSchema.safeParse({ planoId: rawPlanoId });
  if (!parsed.success) return { error: "Plano inválido" };

  const plano = await prisma.planoCobranca.findFirst({
    where: { id: parsed.data.planoId, tenantId },
    include: { anoLetivo: true },
  });
  if (!plano) return { error: "Plano não encontrado" };

  // Busca alunos ativos: se turmaId no plano, só aquela turma; senão, todo o ano letivo
  const enrollments = await prisma.turmaEnrollment.findMany({
    where: {
      tenantId,
      anoLetivoId: plano.anoLetivoId,
      status: "ATIVA",
      ...(plano.turmaId && { turmaId: plano.turmaId }),
    },
    include: { student: { select: { id: true, name: true, email: true, cpf: true, phone: true } } },
  });

  if (enrollments.length === 0) return { error: "Nenhum aluno ativo encontrado para este plano" };

  let geradas = 0;
  const syncPromises: Promise<void>[] = [];

  for (const enrollment of enrollments) {
    for (const mes of plano.meses) {
      const vencimento = new Date(plano.anoLetivo.year, mes - 1, plano.vencimentoDia);
      const mensalidade = await upsertMensalidade(tenantId, {
        studentId: enrollment.studentId,
        planoId: plano.id,
        anoLetivoId: plano.anoLetivoId,
        mes,
        ano: plano.anoLetivo.year,
        valorCents: plano.valorCents,
        vencimento,
      });
      geradas++;

      // Sync Omie fire-and-forget
      const { student } = enrollment;
      syncPromises.push(
        syncMensalidadeToOmie({
          mensalidadeId: mensalidade.id,
          userId: student.id,
          userName: student.name,
          userEmail: student.email,
          userCpf: student.cpf,
          userPhone: student.phone,
          valorCents: plano.valorCents,
          vencimento,
          descricao: `${plano.nome} ${String(mes).padStart(2, "0")}/${plano.anoLetivo.year}`,
        }),
      );
    }
  }

  // Inicia syncs sem aguardar — fire-and-forget
  void Promise.allSettled(syncPromises).then((results) => {
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) console.error(`[gerarMensalidades] ${failed} sync(s) Omie falharam`);
  });

  await createAuditLog(tenantId, userId, "financeiro.mensalidades_geradas", `plano:${plano.id}`, { total: geradas });
  revalidatePath("/admin/secretaria/financeiro");
  return { success: true, total: geradas };
}

// ─── ATUALIZAR MENSALIDADE ────────────────────────────────────────────────────

export async function updateMensalidadeAction(id: string, rawData: unknown) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = UpdateMensalidadeSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  await updateMensalidadeStatus(tenantId, id, {
    status: parsed.data.status,
    ...(parsed.data.paidAt !== undefined && { paidAt: parsed.data.paidAt }),
    ...(parsed.data.descontoCents !== undefined && { descontoCents: parsed.data.descontoCents }),
  });
  await createAuditLog(tenantId, userId, "financeiro.mensalidade_updated", `mensalidade:${id}`, { status: parsed.data.status });
  revalidatePath("/admin/secretaria/financeiro");
  return { success: true };
}

// ─── MARCAR VENCIDAS (cron ou manual) ────────────────────────────────────────

export async function marcarVencidasAction() {
  const { tenantId } = await requireAdmin();
  const result = await markVencidas(tenantId);
  revalidatePath("/admin/secretaria/financeiro");
  return { success: true, updated: result.count };
}
