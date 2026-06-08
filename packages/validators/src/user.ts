import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128),
  tenantId: z.string().optional(),
});

export const CreateUserSchema = z.object({
  email: z.string().email("Email inválido").max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(120),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter 11 dígitos")
    .optional(),
});

export const UpdateUserSchema = CreateUserSchema.omit({ password: true }).partial();

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
