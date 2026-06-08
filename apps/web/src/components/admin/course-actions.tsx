"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@nexora/ui";
import { publishCourseAction, archiveCourseAction, deleteCourseAction } from "@/actions/courses";
import type { CourseStatus } from "@nexora/db";

interface Props {
  course: { id: string; status: CourseStatus; isOfficial: boolean };
}

type ActionResult = { error?: string; success?: boolean } | void;

export function CourseActions({ course }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function confirmAndRun(message: string, action: () => Promise<ActionResult>) {
    if (!confirm(message)) return;
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        toast({ variant: "destructive", title: "Não foi possível", description: result.error });
        return;
      }
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
            confirmAndRun(
              course.isOfficial
                ? "Arquivar este curso oficial? Ele sairá do ar para novos alunos e os matriculados serão avisados."
                : "Arquivar este curso? Ele não ficará mais visível para novos alunos.",
              () => archiveCourseAction(course.id),
            )
          }
        >
          Arquivar
        </Button>
      )}
      {course.isOfficial ? (
        <Button size="sm" variant="destructive" disabled title="Cursos oficiais não podem ser excluídos — arquive-os">
          Excluir
        </Button>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Excluir este curso de TESTE? Esta ação é irreversível e remove em cascata matrículas, progresso, certificados e submissões.")) return;
            startTransition(async () => {
              const r = await deleteCourseAction(course.id);
              if (r && "error" in r && r.error) {
                toast({ variant: "destructive", title: "Não foi possível", description: r.error });
                return;
              }
              toast({ variant: "success", title: "Curso excluído" });
              router.push("/admin/cursos");
            });
          }}
        >
          Excluir
        </Button>
      )}
    </div>
  );
}
