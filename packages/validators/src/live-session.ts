import { z } from "zod";

const SafeUrl = z
  .string()
  .min(1)
  .max(2000)
  .refine(
    (v) => /^https?:\/\//i.test(v),
    "URL deve começar com https://",
  );

export const CreateLiveSessionSchema = z.object({
  lessonId: z.string().min(1),
  meetingUrl: SafeUrl,
  startAt: z.coerce.date().refine((d) => d > new Date(), "A data deve ser no futuro"),
  durationMin: z.number().int().min(5).max(480).default(60),
});

export const UpdateLiveSessionSchema = z.object({
  meetingUrl: SafeUrl.optional(),
  startAt: z.coerce.date().optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
  status: z.enum(["SCHEDULED", "LIVE", "ENDED", "CANCELLED"]).optional(),
  recordingUrl: SafeUrl.nullable().optional(),
});

export type CreateLiveSessionInput = z.infer<typeof CreateLiveSessionSchema>;
export type UpdateLiveSessionInput = z.infer<typeof UpdateLiveSessionSchema>;
