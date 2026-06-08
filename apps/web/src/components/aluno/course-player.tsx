"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, FileText, Link2, Play, Video } from "lucide-react";
import { cn, Button } from "@nexora/ui";
import { markLessonCompleteAction, markLessonIncompleteAction } from "@/actions/progress";
import type { LessonType } from "@nexora/db";

type Lesson = {
  id: string;
  title: string;
  type: LessonType;
  position: number;
  videoRef?: string | null;
  content?: string | null;
  url?: string | null;
};

type Module = {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
};

type Course = {
  slug: string;
  title: string;
  modules: Module[];
};

interface Props {
  course: Course;
  activeLesson: Lesson | null;
  completedLessonIds: string[];
  enrollmentId: string | null;
}

const lessonTypeIcon: Record<LessonType, React.ReactNode> = {
  VIDEO: <Play className="h-3.5 w-3.5" />,
  PDF: <FileText className="h-3.5 w-3.5" />,
  TEXT: <FileText className="h-3.5 w-3.5" />,
  LINK: <Link2 className="h-3.5 w-3.5" />,
  LIVE: <Video className="h-3.5 w-3.5" />,
};

export function CoursePlayer({ course, activeLesson, completedLessonIds, enrollmentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCompleted = activeLesson ? completedLessonIds.includes(activeLesson.id) : false;

  function toggleComplete() {
    if (!activeLesson || !enrollmentId) return;
    startTransition(async () => {
      if (isCompleted) {
        await markLessonIncompleteAction(activeLesson.id, course.slug);
      } else {
        await markLessonCompleteAction(activeLesson.id, course.slug);
        // Avançar automaticamente para a próxima aula não concluída
        const allLessons = course.modules.flatMap((m) => m.lessons);
        const idx = allLessons.findIndex((l) => l.id === activeLesson.id);
        const next = allLessons.slice(idx + 1).find((l) => !completedLessonIds.includes(l.id) && l.id !== activeLesson.id);
        if (next) router.push(`/aluno/cursos/${course.slug}?aula=${next.id}`);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-0">
      {/* Conteúdo principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeLesson ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <LessonContent lesson={activeLesson} />
            </div>
            <div className="shrink-0 border-t border-navy-100 bg-white px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium text-navy-800 truncate">{activeLesson.title}</p>
              {enrollmentId && (
                <Button
                  size="sm"
                  variant={isCompleted ? "outline" : "default"}
                  onClick={toggleComplete}
                  disabled={isPending}
                  className="shrink-0 gap-2"
                >
                  {isCompleted ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Concluída
                    </>
                  ) : (
                    "Marcar como concluída"
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-navy-400">
            Selecione uma aula
          </div>
        )}
      </div>

      {/* Sidebar de módulos */}
      <div className="hidden w-72 shrink-0 overflow-y-auto border-l border-navy-100 bg-white lg:block">
        <div className="sticky top-0 border-b border-navy-100 bg-white px-4 py-3">
          <p className="font-semibold text-navy-900 text-sm">{course.title}</p>
          <p className="text-xs text-navy-400">
            {completedLessonIds.length} / {course.modules.reduce((a, m) => a + m.lessons.length, 0)} aulas
          </p>
        </div>

        {course.modules.map((mod) => (
          <div key={mod.id} className="border-b border-navy-50">
            <p className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-navy-500 bg-navy-50">
              {mod.title}
            </p>
            {mod.lessons.map((lesson) => {
              const done = completedLessonIds.includes(lesson.id);
              const active = activeLesson?.id === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => router.push(`/aluno/cursos/${course.slug}?aula=${lesson.id}`)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    active ? "bg-teal-50 text-teal-700" : "text-navy-700 hover:bg-navy-50",
                  )}
                >
                  <span className={cn("shrink-0", done ? "text-teal-500" : "text-navy-300")}>
                    {done ? <Check className="h-3.5 w-3.5" /> : lessonTypeIcon[lesson.type]}
                  </span>
                  <span className="flex-1 leading-tight">{lesson.title}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-teal-500" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonContent({ lesson }: { lesson: Lesson }) {
  switch (lesson.type) {
    case "VIDEO":
      return lesson.videoRef ? (
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${lesson.videoRef}?rel=0`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={lesson.title}
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-navy-100 text-navy-400">
          Vídeo não disponível
        </div>
      );

    case "PDF":
      return <PdfViewer lessonId={lesson.id} />;

    case "TEXT":
      return (
        <article className="prose prose-navy max-w-none px-6 py-8">
          <div dangerouslySetInnerHTML={{ __html: lesson.content ?? "" }} />
        </article>
      );

    case "LINK":
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <Link2 className="h-12 w-12 text-navy-300" />
          <p className="text-navy-600">Este conteúdo está em um link externo.</p>
          {lesson.url && (
            <Button asChild>
              <a href={lesson.url} target="_blank" rel="noopener noreferrer">
                Abrir conteúdo
              </a>
            </Button>
          )}
        </div>
      );

    case "LIVE":
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <Video className="h-12 w-12 text-navy-300" />
          <p className="text-navy-600">Aula ao vivo — aguarde o link ser disponibilizado.</p>
          {lesson.url && (
            <Button asChild>
              <a href={lesson.url} target="_blank" rel="noopener noreferrer">
                Entrar na aula
              </a>
            </Button>
          )}
        </div>
      );
  }
}

interface PdfData {
  url: string;
  inline: boolean;
  filename: string;
}

function PdfViewer({ lessonId }: { lessonId: string }) {
  // URL resolvida server-side via API route — nunca exposta diretamente
  const [data, setData] = React.useState<PdfData | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/aulas/${lessonId}/pdf`)
      .then((r) => r.json())
      .then((d: { url?: string; inline?: boolean; filename?: string }) => {
        if (d.url) setData({ url: d.url, inline: d.inline ?? true, filename: d.filename ?? "arquivo" });
        else setError(true);
      })
      .catch(() => setError(true));
  }, [lessonId]);

  if (error) return <p className="p-8 text-center text-navy-400">Erro ao carregar o material.</p>;
  if (!data) return <p className="p-8 text-center text-navy-400">Carregando...</p>;

  // Formatos não renderizáveis no browser (docx, pptx, xlsx, zip) → download
  if (!data.inline) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <FileText className="h-12 w-12 text-navy-300" />
        <p className="text-navy-600">Este material está disponível para download.</p>
        <Button asChild>
          <a href={data.url} download={data.filename}>
            Baixar {data.filename}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <iframe
      src={data.url}
      className="h-full w-full"
      title="Material"
    />
  );
}

// Importar React para usar no PdfViewer (necessário pois o arquivo está em .tsx sem importação explícita)
import React from "react";
