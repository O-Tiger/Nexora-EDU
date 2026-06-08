import { Badge } from "@nexora/ui";
import type { EnrollmentStatus } from "@nexora/db";

const labels: Record<EnrollmentStatus, string> = {
  ACTIVE: "Ativa",
  EXPIRED: "Expirada",
  CANCELLED: "Cancelada",
  SUSPENDED: "Suspensa",
};

const variants: Record<EnrollmentStatus, "default" | "outline" | "destructive" | "warning"> = {
  ACTIVE: "default",
  EXPIRED: "warning",
  CANCELLED: "destructive",
  SUSPENDED: "outline",
};

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return <Badge variant={variants[status] as "default" | "outline"}>{labels[status]}</Badge>;
}
