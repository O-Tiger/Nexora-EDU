import type { Metadata } from "next";
import { CourseForm } from "@/components/admin/course-form";

export const metadata: Metadata = { title: "Novo Curso" };

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Novo curso</h1>
        <p className="text-sm text-navy-500">Preencha os dados básicos do curso. Você poderá adicionar módulos e aulas depois.</p>
      </div>
      <CourseForm />
    </div>
  );
}
