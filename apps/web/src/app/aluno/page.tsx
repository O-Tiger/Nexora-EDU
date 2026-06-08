import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { getStudentEnrollmentsWithProgress } from "@nexora/db/src/queries/progress";
import { getCachedProgress, setCachedProgress } from "@/lib/redis";
import { EmptyState, Card, CardContent, Badge } from "@nexora/ui";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Início" };

export default async function StudentHomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollments = await getStudentEnrollmentsWithProgress(
    session.user.id,
    session.user.activeTenantId,
  );

  // Calcular progresso (com cache Redis)
  const enrollmentsWithProgress = await Promise.all(
    enrollments.map(async (e) => {
      let percent = await getCachedProgress(e.id);
      if (percent === null) {
        const totalLessons = e.course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
        const completed = e.progress.length;
        percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
        await setCachedProgress(e.id, percent);
      }
      return { ...e, percent };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Olá, {session.user.name.split(" ")[0]}</h1>
        <p className="text-sm text-navy-500">
          {enrollmentsWithProgress.length} curso{enrollmentsWithProgress.length !== 1 ? "s" : ""} ativo{enrollmentsWithProgress.length !== 1 ? "s" : ""}
        </p>
      </div>

      {enrollmentsWithProgress.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Nenhum curso ainda"
          description="Aguarde a sua matrícula ser confirmada pelo administrador."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {enrollmentsWithProgress.map((e) => (
            <Link key={e.id} href={`/aluno/cursos/${e.course.slug}`}>
              <Card className="hover:border-teal-300 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-navy-900">{e.course.title}</h3>
                    {e.percent === 100 && <Badge variant="success">Concluído</Badge>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-navy-500">
                      <span>{e.progress.length} de {e.course.modules.reduce((a, m) => a + m.lessons.length, 0)} aulas</span>
                      <span>{e.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${e.percent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
