import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Layout, ChevronRight } from "lucide-react";
import { getLatestPublished } from "@nexora/db/src/queries/layouts";
import { PAGE_TYPES, type PageType } from "@nexora/validators";

export const metadata: Metadata = { title: "Páginas" };

const PAGE_LABELS: Record<PageType, { label: string; desc: string }> = {
  home: { label: "Página inicial", desc: "Landing pública da instituição" },
  course: { label: "Página de curso", desc: "Modelo de apresentação de curso" },
  login: { label: "Tela de login", desc: "Mensagem e destaque da tela de entrada" },
  certificate: { label: "Certificado", desc: "Layout da página de validação" },
};

export default async function PaginasPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const statuses = await Promise.all(
    PAGE_TYPES.map(async (pt) => ({ pt, published: await getLatestPublished(tenantId, pt) })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Páginas</h1>
        <p className="text-sm text-navy-500">Edite o visual da plataforma sem código.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {statuses.map(({ pt, published }) => (
          <Link
            key={pt}
            href={`/admin/paginas/${pt}`}
            className="flex items-center gap-4 rounded-lg border border-navy-100 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm"
          >
            <div className="rounded-md bg-teal-50 p-2.5 text-teal-600">
              <Layout className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-navy-900">{PAGE_LABELS[pt].label}</p>
              <p className="text-xs text-navy-400">{PAGE_LABELS[pt].desc}</p>
            </div>
            <span className="text-xs text-navy-400">
              {published ? `Publicada v${published.version}` : "Não publicada"}
            </span>
            <ChevronRight className="h-4 w-4 text-navy-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
