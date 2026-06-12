"use client";

import { EmptyState } from "@nexora/ui";
import { Users } from "lucide-react";
import { EnrollUserDialog } from "./enroll-user-dialog";

interface Props {
  courses: { id: string; title: string }[];
  students: { id: string; name: string | null; email: string }[];
}

export function EnrollmentsEmptyState({ courses, students }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="Nenhuma matrícula ainda"
        description="Matricule um aluno em um curso publicado para começar."
      />
      <EnrollUserDialog
        courses={courses}
        students={students.map((s) => ({ id: s.id, name: s.name ?? "—", email: s.email }))}
      />
    </div>
  );
}
