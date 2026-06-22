import { z } from "zod";

export const PlanoCobrancaSchema = z.object({
  anoLetivoId: z.string().min(1),
  turmaId: z.string().optional(),
  nome: z.string().min(1).max(120),
  valorCents: z.number().int().positive(),
  vencimentoDia: z.number().int().min(1).max(28),
  meses: z.array(z.number().int().min(1).max(12)).min(1).max(12),
  ativo: z.boolean().default(true),
});

export type PlanoCobrancaInput = z.infer<typeof PlanoCobrancaSchema>;

export const GerarMensalidadesSchema = z.object({
  planoId: z.string().min(1),
});

export type GerarMensalidadesInput = z.infer<typeof GerarMensalidadesSchema>;

export const UpdateMensalidadeSchema = z.object({
  status: z.enum(["PENDENTE", "PAGA", "VENCIDA", "CANCELADA", "ISENTA"]),
  descontoCents: z.number().int().min(0).optional(),
  paidAt: z.coerce.date().optional(),
});

export type UpdateMensalidadeInput = z.infer<typeof UpdateMensalidadeSchema>;

export const MESES_LABELS: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
  5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
  9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

export const MENSALIDADE_TIPO_LABELS: Record<string, string> = {
  MENSALIDADE: "Mensalidade",
  TAXA_RESERVA: "Taxa de Reserva",
};

export const MENSALIDADE_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  ISENTA: "Isenta",
};
