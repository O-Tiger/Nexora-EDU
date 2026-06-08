import { Badge } from "@nexora/ui";
import type { CourseStatus } from "@nexora/db";

const labels: Record<CourseStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

const variants: Record<CourseStatus, "secondary" | "default" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
