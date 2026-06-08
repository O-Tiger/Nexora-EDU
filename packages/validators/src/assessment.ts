import { z } from "zod";

export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "TRUE_FALSE", "ESSAY"] as const;
export const QuestionTypeSchema = z.enum(QUESTION_TYPES);

export const QuestionOptionSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(1000),
});

/** Questão autorada pelo admin (com gabarito). */
export const QuestionSchema = z
  .object({
    id: z.string().max(64).optional(),
    type: QuestionTypeSchema,
    prompt: z.string().min(1).max(5000),
    points: z.number().min(0).max(1000).default(1),
    position: z.number().int().min(0).default(0),
    options: z.array(QuestionOptionSchema).min(2).max(10).optional(),
    // MC: id da opção correta | TF: boolean | ESSAY: ausente
    correctAnswer: z.union([z.string().max(64), z.boolean()]).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "MULTIPLE_CHOICE") {
      if (!q.options || q.options.length < 2) {
        ctx.addIssue({ code: "custom", message: "Múltipla escolha precisa de ao menos 2 opções" });
        return;
      }
      const ids = new Set(q.options.map((o) => o.id));
      if (typeof q.correctAnswer !== "string" || !ids.has(q.correctAnswer)) {
        ctx.addIssue({ code: "custom", message: "Selecione a alternativa correta" });
      }
    } else if (q.type === "TRUE_FALSE") {
      if (typeof q.correctAnswer !== "boolean") {
        ctx.addIssue({ code: "custom", message: "Defina se a resposta correta é Verdadeiro ou Falso" });
      }
    }
    // ESSAY: correção manual, sem gabarito
  });

export const QuestionsSchema = z.array(QuestionSchema).max(100);

export const CreateAssessmentSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1).optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  passingScore: z.number().min(0).max(1000).default(6),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  dueAt: z.coerce.date().optional(),
  formulaVar: z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Variável deve começar com letra (ex: p1)")
    .max(20)
    .optional(),
  recoveryOfId: z.string().min(1).optional(),
});

export const UpdateAssessmentSchema = CreateAssessmentSchema.partial().omit({ courseId: true });

/** Fórmula de nota final do curso — validada de novo no servidor com mathjs. */
export const GradeFormulaSchema = z.string().max(500);

/** Respostas do aluno: { [questionId]: resposta }. ESSAY = string, demais string/boolean. */
export const SubmissionAnswersSchema = z.record(
  z.string().max(64),
  z.union([z.string().max(20000), z.boolean()]),
);

export type QuestionInput = z.infer<typeof QuestionSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentSchema>;
export type SubmissionAnswers = z.infer<typeof SubmissionAnswersSchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
