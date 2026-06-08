import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import { getPublishedBlocks } from "@nexora/db/src/queries/layouts";
import { PageBlocksSchema, PAGE_TYPES, type PageType } from "@nexora/validators";
import { PageRenderer } from "@/components/page-builder/page-renderer";

// Renderiza a versão publicada de uma página montada no Page Builder.
// TODO(fase-2): hospedagem pública precisa resolver o tenant por domínio/subdomínio.
// Por enquanto exige sessão e usa o tenant ativo — evita servir página de outro tenant.
export const dynamic = "force-dynamic";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ pageType: string }>;
}) {
  const { pageType } = await params;
  if (!PAGE_TYPES.includes(pageType as PageType)) notFound();
  const pt = pageType as PageType;

  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const raw = await getPublishedBlocks(tenantId, pt);
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
