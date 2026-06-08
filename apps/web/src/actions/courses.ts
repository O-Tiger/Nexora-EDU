"use server";

import { auth } from "@nexora/auth";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  reorderModules,
  reorderLessons,
} from "@nexora/db/src/queries/courses";
import {
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from "@nexora/db/src/queries/modules";
import { CreateCourseSchema, UpdateCourseSchema } from "@nexora/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") {
    redirect("/unauthorized");
  }
  return { tenantId: activeTenantId, userId: session.user.id };
}

// ─── Cursos ───────────────────────────────────────────────────────────────────

export async function createCourseAction(formData: FormData) {
  const { tenantId } = await requireAdmin();

  const raw = {
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? undefined,
    hoursTotal: Number(formData.get("hoursTotal") ?? 0),
  };

  const parsed = CreateCourseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const course = await createCourse(tenantId, parsed.data);
  revalidatePath("/admin/cursos");
  return { courseId: course.id };
}

export async function updateCourseAction(id: string, formData: FormData) {
  const { tenantId } = await requireAdmin();

  const raw = {
    title: formData.get("title") ?? undefined,
    slug: formData.get("slug") ?? undefined,
    description: formData.get("description") ?? undefined,
    hoursTotal: formData.get("hoursTotal") ? Number(formData.get("hoursTotal")) : undefined,
  };

  const parsed = UpdateCourseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  await updateCourse(tenantId, id, parsed.data);
  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${id}`);
  return { success: true };
}

export async function publishCourseAction(id: string) {
  const { tenantId } = await requireAdmin();
  await updateCourse(tenantId, id, { status: "PUBLISHED" });
  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${id}`);
}

export async function archiveCourseAction(id: string) {
  const { tenantId } = await requireAdmin();
  await updateCourse(tenantId, id, { status: "ARCHIVED" });
  revalidatePath("/admin/cursos");
}

export async function deleteCourseAction(id: string) {
  const { tenantId } = await requireAdmin();
  await deleteCourse(tenantId, id);
  revalidatePath("/admin/cursos");
}

// ─── Módulos ──────────────────────────────────────────────────────────────────

export async function createModuleAction(courseId: string, title: string) {
  const { tenantId } = await requireAdmin();
  if (!title.trim()) return { error: "Título obrigatório" };
  const mod = await createModule(tenantId, courseId, { title: title.trim() });
  revalidatePath(`/admin/cursos/${courseId}`);
  return { moduleId: mod.id };
}

export async function updateModuleAction(courseId: string, moduleId: string, title: string) {
  const { tenantId } = await requireAdmin();
  if (!title.trim()) return { error: "Título obrigatório" };
  await updateModule(tenantId, moduleId, { title: title.trim() });
  revalidatePath(`/admin/cursos/${courseId}`);
  return { success: true };
}

export async function deleteModuleAction(courseId: string, moduleId: string) {
  const { tenantId } = await requireAdmin();
  await deleteModule(tenantId, moduleId);
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function reorderModulesAction(courseId: string, orderedIds: string[]) {
  const { tenantId } = await requireAdmin();
  await reorderModules(tenantId, courseId, orderedIds);
  revalidatePath(`/admin/cursos/${courseId}`);
}

// ─── Aulas ────────────────────────────────────────────────────────────────────

export async function createLessonAction(
  courseId: string,
  moduleId: string,
  data: {
    title: string;
    type: "VIDEO" | "PDF" | "TEXT" | "LINK" | "LIVE";
    videoRef?: string;
    fileKey?: string;
    content?: string;
    url?: string;
    duration?: number;
  },
) {
  const { tenantId } = await requireAdmin();
  if (!data.title.trim()) return { error: "Título obrigatório" };
  const lesson = await createLesson(tenantId, moduleId, { ...data, title: data.title.trim() });
  revalidatePath(`/admin/cursos/${courseId}`);
  return { lessonId: lesson.id };
}

export async function updateLessonAction(
  courseId: string,
  lessonId: string,
  data: Partial<{ title: string; videoRef: string; fileKey: string; content: string; url: string; duration: number }>,
) {
  const { tenantId } = await requireAdmin();
  await updateLesson(tenantId, lessonId, data);
  revalidatePath(`/admin/cursos/${courseId}`);
  return { success: true };
}

export async function deleteLessonAction(courseId: string, lessonId: string) {
  const { tenantId } = await requireAdmin();
  await deleteLesson(tenantId, lessonId);
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function reorderLessonsAction(courseId: string, moduleId: string, orderedIds: string[]) {
  const { tenantId } = await requireAdmin();
  await reorderLessons(tenantId, moduleId, orderedIds);
  revalidatePath(`/admin/cursos/${courseId}`);
}
