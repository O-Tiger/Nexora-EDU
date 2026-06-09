import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { getCourses } from "@nexora/db/src/queries/courses";
import {
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nexora/ui";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { CourseStatusBadge } from "@/components/admin/course-status-badge";

export const metadata: Metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const courses = await getCourses(session.user.activeTenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Cursos</h1>
          <p className="text-sm text-navy-500">{courses.length} curso{courses.length !== 1 ? "s" : ""} cadastrado{courses.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/admin/cursos/novo">
            <Plus className="h-4 w-4" />
            Novo curso
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Nenhum curso ainda"
          description="Crie seu primeiro curso para começar a publicar conteúdo."
          action={{ label: "Criar curso", href: "/admin/cursos/novo" }}
        />
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Matrículas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Carga horária</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-navy-900">{course.title}</p>
                      <p className="text-xs text-navy-400">{course.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>{course._count.modules}</TableCell>
                  <TableCell>{course._count.enrollments}</TableCell>
                  <TableCell>
                    <CourseStatusBadge status={course.status} />
                  </TableCell>
                  <TableCell>{course.hoursTotal}h</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/cursos/${course.id}`}>Editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
