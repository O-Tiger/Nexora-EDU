import { z } from "zod";
import type { Etapa } from "./secretaria";
import { ETAPA_ANO_RANGE } from "./secretaria";

// ─── Progressão etapa/ano ─────────────────────────────────────────────────────

export type ProximaEtapaAno = { etapa: Etapa; ano: number } | null;

/**
 * Calcula a etapa e o ano do próximo ano letivo para um aluno.
 * Retorna null quando o aluno está no último ano do Ensino Médio (formado).
 *
 * Transições de etapa:
 *   EI  max → EF1 1
 *   EF1 5   → EF2 6   (EF2 começa no ano 6)
 *   EF2 9   → EM  1
 *   EM  3   → null    (formado)
 */
export function getProximaEtapaAno(etapa: Etapa, ano: number): ProximaEtapaAno {
  const range = ETAPA_ANO_RANGE[etapa];

  if (ano < range.max) {
    // Ainda dentro da mesma etapa — incrementa o ano
    return { etapa, ano: ano + 1 };
  }

  // Fim da etapa — transição para a próxima
  switch (etapa) {
    case "EI":  return { etapa: "EF1", ano: ETAPA_ANO_RANGE.EF1.min };
    case "EF1": return { etapa: "EF2", ano: ETAPA_ANO_RANGE.EF2.min }; // EF2 min = 6
    case "EF2": return { etapa: "EM",  ano: ETAPA_ANO_RANGE.EM.min };
    case "EM":  return null; // formado
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ReservaVagaSchema = z.object({
  studentId:        z.string().cuid(),
  anoLetivoAtualId: z.string().cuid(),
  turmaAtualId:     z.string().cuid(),
  /// ID do próximo AnoLetivo (deve existir antes de abrir reservas)
  proximoAnoLetivoId: z.string().cuid(),
  /// Valor da taxa de reserva em centavos
  taxaReservaCents: z.number().int().positive(),
  /// Dia de vencimento da taxa (default 10)
  vencimentoDia:    z.number().int().min(1).max(28).default(10),
  entrevistaAt:     z.coerce.date().optional(),
  notes:            z.string().max(500).optional(),
});

export type ReservaVagaInput = z.infer<typeof ReservaVagaSchema>;

export const CancelarReservaSchema = z.object({
  cancelReason: z.string().min(5).max(500),
});

export type CancelarReservaInput = z.infer<typeof CancelarReservaSchema>;

export const RESERVA_STATUS_LABELS: Record<string, string> = {
  PENDENTE:   "Pendente (aguardando taxa)",
  PAGA:       "Taxa paga — vaga garantida",
  CONFIRMADA: "Matrícula confirmada",
  CANCELADA:  "Cancelada",
};
