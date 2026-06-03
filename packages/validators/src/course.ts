import { z } from "zod";

export const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z.string().max(2000).optional(),
  hoursTotal: z.number().int().min(0).max(9999).default(0),
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
