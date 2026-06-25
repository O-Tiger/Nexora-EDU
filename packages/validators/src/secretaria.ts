import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const EtapaValues = ["EI", "EF1", "EF2", "EM"] as const;
export type Etapa = (typeof EtapaValues)[number];

export const PeriodoValues = ["MANHA", "TARDE", "NOITE", "INTEGRAL"] as const;

export const UnidadeGenderValues = ["MASCULINO", "FEMININO", "MISTO"] as const;

export const GuardianRelationshipValues = ["PAI", "MAE", "RESPONSAVEL", "OUTRO"] as const;

export const TurmaEnrollmentStatusValues = ["ATIVA", "TRANSFERIDA", "CANCELADA", "CONCLUIDA"] as const;

// ─── Labels (pt-BR) ───────────────────────────────────────────────────────────

export const ETAPA_LABELS: Record<Etapa, string> = {
  EI:  "Educação Infantil",
  EF1: "Ensino Fundamental — Anos Iniciais",
  EF2: "Ensino Fundamental — Anos Finais",
  EM:  "Ensino Médio",
};

export const ETAPA_ANO_RANGE: Record<Etapa, { min: number; max: number }> = {
  EI:  { min: 1, max: 5 },
  EF1: { min: 1, max: 5 },
  EF2: { min: 6, max: 9 },
  EM:  { min: 1, max: 3 },
};

/**
 * Gera o código da turma a partir dos campos estruturados.
 * O prefixo de etapa é fornecido pelo tenant (configurável).
 * Padrão: {etapaPrefix}{ano}{letra}{unidadeCode}
 *
 * Exemplo CCC:
 *   etapaPrefix="EFAI", ano=3, letra="A", unidadeCode="COL" → "EFAI3ACOL"
 *   etapaPrefix="EFAICCC", ano=1, letra="A", unidadeCode=""  → "EFAICCC1A"
 *
 * Exemplo escola comum:
 *   etapaPrefix="EF", ano=3, letra="A", unidadeCode=""       → "EF3A"
 */
export function buildTurmaCode(params: {
  etapaPrefix: string;
  ano: number;
  letra: string;
  unidadeCode: string;
}): string {
  return `${params.etapaPrefix}${params.ano}${params.letra.toUpperCase()}${params.unidadeCode}`;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const UnidadeSchema = z.object({
  name: z.string().min(1).max(80),
  code: z.string().max(10).regex(/^[A-Z0-9]*$/, "Apenas letras maiúsculas e números"),
  gender: z.enum(UnidadeGenderValues),
});

export const AnoLetivoSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const TurmaSchema = z.object({
  unidadeId:   z.string().cuid(),
  anoLetivoId: z.string().cuid(),
  etapa:       z.enum(EtapaValues),
  ano:         z.number().int().min(1).max(9),
  letra:       z.string().min(1).max(3).regex(/^[A-Za-z]+$/),
  periodo:     z.enum(PeriodoValues),
  maxStudents: z.number().int().min(1).max(100).default(35),
  /// Prefixo de etapa configurado pelo tenant (ex: "EFAI", "EFAICCC", "EF")
  etapaPrefix: z.string().min(1).max(20),
});

export const TurmaEnrollmentSchema = z.object({
  studentId:   z.string().cuid(),
  turmaId:     z.string().cuid(),
  anoLetivoId: z.string().cuid(),
  notes:       z.string().max(500).optional(),
});

export const GuardianSchema = z.object({
  studentId:    z.string().cuid(),
  name:         z.string().min(1).max(120),
  email:        z.string().email().optional().or(z.literal("")),
  phone:        z.string().max(20).optional(),
  cpf:          z.string().max(14).optional(),
  relationship: z.enum(GuardianRelationshipValues),
  isPrimary:    z.boolean().default(false),
});
