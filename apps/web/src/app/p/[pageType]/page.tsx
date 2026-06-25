import { headers } from "next/headers";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import { getPublishedBlocks, getPageConfig } from "@nexora/db/src/queries/layouts";
import { getTenantByDomain } from "@nexora/db/src/queries/domains";
import { PageBlocksSchema, PAGE_TYPES, type PageType } from "@nexora/validators";
import { PageRenderer } from "@/components/page-builder/page-renderer";

// Renderiza a versão publicada de uma página montada no Page Builder.
// Resolução de tenant: 1) domínio público mapeado (TenantDomain) → acesso sem login;
// 2) fallback para a sessão ativa (preview interno).
export const dynamic = "force-dynamic";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ pageType: string }>;
}) {
  const { pageType } = await params;
  if (!PAGE_TYPES.includes(pageType as PageType)) notFound();
  const pt = pageType as PageType;

  // 1) Tenta resolver pelo host público (domínio mapeado) — não exige login
  const host = (await headers()).get("host") ?? "";
  let tenantId = await getTenantByDomain(host);

  // 2) Sem domínio mapeado: usa a sessão ativa (preview/uso interno)
  if (!tenantId) {
    const session = await auth();
    if (!session) redirect("/login");
    tenantId = session.user.activeTenantId;
  }

  const [raw, config] = await Promise.all([
    getPublishedBlocks(tenantId, pt),
    getPageConfig(tenantId, pt),
  ]);

  if (config?.archivedAt || !config?.liveAt) notFound();

  const parsed = PageBlocksSchema.safeParse(raw ?? []);
  const blocks = parsed.success ? parsed.data : [];

  if (blocks.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-50 px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-navy-700">Página ainda não publicada</h1>
          <p className="mt-2 text-sm text-navy-400">O conteúdo desta página será exibido após a publicação.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <PageRenderer blocks={blocks} tenantId={tenantId} />
    </main>
  );
}
