"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label, Textarea, toast } from "@nexora/ui";
import { createCourseAction, updateCourseAction } from "@/actions/courses";

interface CourseFormProps {
  course?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    hoursTotal: number;
    isOfficial: boolean;
  };
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CourseForm({ course }: CourseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!course);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlug(toSlug(value));
    setSlugTouched(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = course
        ? await updateCourseAction(course.id, fd)
        : await createCourseAction(fd);

      if ("error" in result && result.error) {
        toast({ variant: "destructive", title: "Erro", description: result.error });
        return;
      }

      toast({ variant: "success", title: course ? "Curso atualizado" : "Curso criado" });
      router.push("/admin/cursos");
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: Introdução ao Direito Civil"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">
              Slug * <span className="text-xs text-navy-400">(URL amigável)</span>
            </Label>
            <Input
              id="slug"
              name="slug"
              required
              maxLength={100}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="introducao-ao-direito-civil"
            />
            <p className="text-xs text-navy-400">
              URL: /cursos/{slug || "..."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              maxLength={2000}
              rows={4}
              defaultValue={course?.description ?? ""}
              placeholder="Descreva o conteúdo e objetivos do curso..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hoursTotal">Carga horária (horas)</Label>
            <Input
              id="hoursTotal"
              name="hoursTotal"
              type="number"
              min={0}
              max={9999}
              defaultValue={course?.hoursTotal ?? 0}
              className="max-w-[160px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="isOfficial">Tipo do curso</Label>
            <select
              id="isOfficial"
              name="isOfficial"
              defaultValue={course?.isOfficial ? "true" : "false"}
              className="h-10 max-w-[220px] rounded-md border border-navy-200 bg-white px-3 text-sm text-navy-800"
            >
              <option value="false">Teste (pode ser excluído)</option>
              <option value="true">Oficial (exclusão bloqueada)</option>
            </select>
            <p className="text-xs text-navy-400">
              Cursos de teste podem ser excluídos em cascata. Oficiais só podem ser arquivados — e os alunos matriculados são avisados.
            </p>
          </div>

          <div className="flex gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Salvando..." : course ? "Salvar alterações" : "Criar curso"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
