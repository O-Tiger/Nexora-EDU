"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@nexora/ui";
import { publishCourseAction, archiveCourseAction, deleteCourseAction } from "@/actions/courses";
import type { CourseStatus } from "@nexora/db";

interface Props {
  course: { id: string; status: CourseStatus };
}

export function CourseActions({ course }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function confirmAndRun(message: string, action: () => Promise<void>) {
    if (!confirm(message)) return;
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {course.status === "DRAFT" && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            confirmAndRun(
              "Publicar este curso? Ele ficará visível para alunos matriculados.",
              () => publishCourseAction(course.id),
            )
          }
        >
          Publicar
        </Button>
      )}
      {course.status === "PUBLISHED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            confirmAndRun("Arquivar este curso? Ele não ficará mais visível para novos alunos.", () =>
              archiveCourseAction(course.id),
            )
          }
        >
          Arquivar
        </Button>
      )}
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={() =>
          confirmAndRun(
            `Excluir permanentemente "${course.id}"? Esta ação não pode ser desfeita e removerá todos os módulos e aulas.`,
            async () => {
              await deleteCourseAction(course.id);
              toast({ variant: "success", title: "Curso excluído" });
              router.push("/admin/cursos");
            },
          )
        }
      >
        Excluir
      </Button>
    </div>
  );
}
