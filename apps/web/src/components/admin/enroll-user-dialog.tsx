"use client";

import { useTransition, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  toast,
} from "@nexora/ui";
import { Plus } from "lucide-react";
import { enrollUserAction } from "@/actions/enrollments";

interface Props {
  courses: { id: string; title: string }[];
  students: { id: string; name: string; email: string }[];
}

export function EnrollUserDialog({ courses, students }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await enrollUserAction(fd);
      if ("error" in result && result.error) {
        toast({ variant: "destructive", title: "Erro", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Aluno matriculado com sucesso" });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Matricular aluno
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Matricular aluno</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Aluno *</Label>
            <Select name="userId" required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Curso *</Label>
            <Select name="courseId" required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiresAt">
              Data de expiração <span className="text-navy-400 text-xs">(opcional)</span>
            </Label>
            <Input id="expiresAt" name="expiresAt" type="date" />
          </div>

          <div className="flex gap-3 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Matriculando..." : "Matricular"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
