import { prisma } from "@nexora/db";
import { updateMensalidadeOmie } from "@nexora/db/src/queries/financeiro";

type OmieCallResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function omieCall<T>(endpoint: string, call: string, param: object): Promise<OmieCallResult<T>> {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    console.warn("[omie] OMIE_APP_KEY or OMIE_APP_SECRET not set — skipping");
    return { ok: false, error: "credentials_missing" };
  }

  try {
    const res = await fetch(`https://app.omie.com.br/api/v1/${endpoint}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call, app_key: appKey, app_secret: appSecret, param: [param] }),
    });
    const json = await res.json() as T & { faultstring?: string };
    if ("faultstring" in json && json.faultstring) {
      return { ok: false, error: String(json.faultstring) };
    }
    return { ok: true, data: json };
  } catch (err) {
    console.error(`[omie.${call}] Request failed: ${err}`);
    return { ok: false, error: String(err) };
  }
}

type OmieUpsertClientResult = {
  codigo_cliente_omie: number;
  codigo_cliente_integracao: string;
};

type OmieCreateReceivableResult = {
  nCodLancamento: number;
};

/**
 * Upserts a student as an Omie client.
 * Returns the Omie client ID or null on failure/skip.
 */
export async function upsertOmieClient(params: {
  integrationId: string; // cuid do User — chave de integração imutável
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
}): Promise<number | null> {
  const result = await omieCall<OmieUpsertClientResult>("geral/clientes", "UpsertCliente", {
    codigo_cliente_integracao: params.integrationId,
    razao_social: params.name,
    nome_fantasia: params.name,
    email: params.email,
    ...(params.cpf && { cnpj_cpf: params.cpf }),
    ...(params.phone && { telefone1_numero: params.phone }),
    inativo: "N",
  });

  if (!result.ok) {
    console.error(`[omie.upsertClient] Failed: ${result.error}`);
    return null;
  }
  return result.data.codigo_cliente_omie;
}

/**
 * Creates an account receivable (conta a receber) in Omie for an enrollment.
 * Returns the Omie receivable ID or null on failure/skip.
 */
export async function createOmieReceivable(params: {
  enrollmentId: string;
  omieClientId: number;
  courseName: string;
  amount: number; // centavos
  dueDate: string; // "DD/MM/YYYY"
}): Promise<number | null> {
  const result = await omieCall<OmieCreateReceivableResult>("financas/contareceber", "IncluirContaReceber", {
    codigo_lancamento_integracao: params.enrollmentId,
    codigo_cliente_fornecedor: params.omieClientId,
    data_vencimento: params.dueDate,
    valor_documento: (params.amount / 100).toFixed(2),
    codigo_tipo_documento: "OUTROS",
    observacao: `Matrícula: ${params.courseName}`,
    status_titulo: "ABERTO",
  });

  if (!result.ok) {
    console.error(`[omie.createReceivable] Failed: ${result.error}`);
    return null;
  }
  return result.data.nCodLancamento;
}

/**
 * Syncs an enrollment to Omie: upsert client + create receivable.
 * Persists result to OmieSync. Fire-and-forget safe (never throws).
 */
export async function syncEnrollmentToOmie(params: {
  enrollmentId: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userCpf?: string | null;
  userPhone?: string | null;
  courseName: string;
}): Promise<void> {
  // Only run for inst_a (Faculdade) — inst_b uses Google Classroom
  if (params.tenantId !== "inst_a") return;

  // Ensure OmieSync row exists in PENDING
  await prisma.omieSync.upsert({
    where: { enrollmentId: params.enrollmentId },
    create: { enrollmentId: params.enrollmentId, tenantId: params.tenantId, status: "PENDING" },
    update: { status: "PENDING", errorMessage: null },
  });

  try {
    const omieClientId = await upsertOmieClient({
      integrationId: params.userId,
      name: params.userName,
      email: params.userEmail,
      ...(params.userCpf != null && { cpf: params.userCpf }),
      ...(params.userPhone != null && { phone: params.userPhone }),
    });

    if (!omieClientId) {
      await prisma.omieSync.update({
        where: { enrollmentId: params.enrollmentId },
        data: { status: "FAILED", errorMessage: "upsertClient returned null" },
      });
      return;
    }

    // Amount defaults to 0 until pricing is integrated — TODO(fase-3-financeiro)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toLocaleDateString("pt-BR").replace(/\//g, "/");

    const omieReceivableId = await createOmieReceivable({
      enrollmentId: params.enrollmentId,
      omieClientId,
      courseName: params.courseName,
      amount: 0,
      dueDate: dueDateStr,
    });

    await prisma.omieSync.update({
      where: { enrollmentId: params.enrollmentId },
      data: {
        status: omieReceivableId ? "SYNCED" : "FAILED",
        omieClientId: String(omieClientId),
        omieReceivableId: omieReceivableId ? String(omieReceivableId) : null,
        lastSyncedAt: new Date(),
        errorMessage: omieReceivableId ? null : "createReceivable returned null",
      },
    });
  } catch (err) {
    console.error(`[omie.syncEnrollment] Unexpected error: ${err}`);
    await prisma.omieSync.update({
      where: { enrollmentId: params.enrollmentId },
      data: { status: "FAILED", errorMessage: String(err) },
    }).catch(() => undefined);
  }
}

/**
 * Syncs a mensalidade (K-12 tuition) to Omie: upsert client + create receivable.
 * Fire-and-forget safe (never throws). Updates Mensalidade.omieSyncStatus.
 */
export async function syncMensalidadeToOmie(params: {
  mensalidadeId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userCpf?: string | null;
  userPhone?: string | null;
  valorCents: number;
  vencimento: Date;
  descricao: string; // ex: "Mensalidade Fev/2026 - Turma EFAI3A"
}): Promise<void> {
  try {
    const omieClientId = await upsertOmieClient({
      integrationId: params.userId,
      name: params.userName,
      email: params.userEmail,
      ...(params.userCpf != null && { cpf: params.userCpf }),
      ...(params.userPhone != null && { phone: params.userPhone }),
    });

    if (!omieClientId) {
      await updateMensalidadeOmie(params.mensalidadeId, { omieSyncStatus: "FAILED", omieError: "upsertClient returned null" });
      return;
    }

    const dueDateStr = params.vencimento.toLocaleDateString("pt-BR");
    const omieReceivableId = await createOmieReceivable({
      enrollmentId: params.mensalidadeId,
      omieClientId,
      courseName: params.descricao,
      amount: params.valorCents,
      dueDate: dueDateStr,
    });

    const syncData = omieReceivableId
      ? { omieClientId: String(omieClientId), omieReceivableId: String(omieReceivableId), omieSyncStatus: "SYNCED" as const, omieError: null }
      : { omieClientId: String(omieClientId), omieSyncStatus: "FAILED" as const, omieError: "createReceivable returned null" };
    await updateMensalidadeOmie(params.mensalidadeId, syncData);
  } catch (err) {
    console.error(`[omie.syncMensalidade] Unexpected error: ${err}`);
    await updateMensalidadeOmie(params.mensalidadeId, {
      omieSyncStatus: "FAILED",
      omieError: String(err),
    }).catch(() => undefined);
  }
}
