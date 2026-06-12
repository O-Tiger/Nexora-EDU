import { z } from "zod";

// ─── Avisos ──────────────────────────────────────────────────────────────────

export const AnnouncementScopeSchema = z.enum(["PLATFORM", "COURSE"]);

const AnnouncementBase = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
  scope: AnnouncementScopeSchema.default("PLATFORM"),
  courseId: z.string().min(1).optional(),
  pinned: z.boolean().default(false),
});

export const CreateAnnouncementSchema = AnnouncementBase.superRefine((v, ctx) => {
  if (v.scope === "COURSE" && !v.courseId) {
    ctx.addIssue({ code: "custom", message: "courseId obrigatório para avisos de curso" });
  }
});

export const UpdateAnnouncementSchema = AnnouncementBase.partial().omit({ scope: true, courseId: true });

// ─── Fórum ───────────────────────────────────────────────────────────────────

export const CreateThreadSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
});

export const CreateReplySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(10000),
  parentId: z.string().min(1).optional(),
});

// ─── Mensagens diretas ────────────────────────────────────────────────────────

export const SendDirectMessageSchema = z.object({
  receiverId: z.string().min(1),
  body: z.string().min(1).max(5000),
  /** Omitir na primeira mensagem — backend gera um novo threadId */
  threadId: z.string().min(1).optional(),
});

// ─── Base de conhecimento ─────────────────────────────────────────────────────

export const KnowledgeEntrySchema = z.object({
  question: z.string().min(3).max(500),
  answer: z.string().min(1).max(5000),
  active: z.boolean().default(true),
});

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
export type CreateThreadInput = z.infer<typeof CreateThreadSchema>;
export type CreateReplyInput = z.infer<typeof CreateReplySchema>;
export type SendDirectMessageInput = z.infer<typeof SendDirectMessageSchema>;
export type KnowledgeEntryInput = z.infer<typeof KnowledgeEntrySchema>;
