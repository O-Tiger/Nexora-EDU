import { redirect } from "next/navigation";

// /aluno/cursos redireciona para /aluno — o dashboard já lista os cursos
export default function AlunoCoursesPage() {
  redirect("/aluno");
}
