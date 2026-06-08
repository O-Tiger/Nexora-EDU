import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import { getCourseById } from "@nexora/db/src/queries/courses";
import { Button } from "@nexora/ui";
import Link from "next/link";
import { ChevronLeft, FileCheck2 } from "lucide-react";
import { CourseForm } from "@/components/admin/course-form";
import { CourseModulesEditor } from "@/components/admin/course-modules-editor";
import { CourseActions } from "@/components/admin/course-actions";

export const metadata: Metadata = { title: "Editar Curso" };

export default async function CourseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const course = await getCourseById(session.user.activeTenantId, id);
  if (!course) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/cursos">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-900">{course.title}</h1>
          <p className="text-sm text-navy-500">/{course.slug}</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/admin/cursos/${course.id}/avaliacoes` as never}>
            <FileCheck2 className="h-4 w-4" /> Avaliações
          </Link>
        </Button>
        <CourseActions course={{ id: course.id, status: course.status }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CourseForm
            course={{
              id: course.id,
              title: course.title,
              slug: course.slug,
              description: course.description,
              hoursTotal: course.hoursTotal,
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <CourseModulesEditor courseId={course.id} modules={course.modules} />
        </div>
      </div>
    </div>
  );
}
