import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@nexora/ui";
import { loadEditor } from "@/actions/layouts";
import { PageBlocksSchema, PAGE_TYPES, type PageType } from "@nexora/validators";
import { PageBuilderEditor } from "@/components/page-builder/page-builder-editor";

export const metadata: Metadata = { title: "Editor de página" };

const LABELS: Record<PageType, string> = {
  home: "Página inicial",
  course: "Página de curso",
  login: "Tela de login",
  certificate: "Certificado",
};

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ pageType: string }>;
}) {
  const { pageType } = await params;
  if (!PAGE_TYPES.includes(pageType as PageType)) notFound();
  const pt = pageType as PageType;

  // loadEditor revalida sessão e role (ADMIN/SUPER_ADMIN) internamente.
  const data = await loadEditor(pt);
  if (!data) notFound();

  // Blocos vêm como JSON do banco — revalida com Zod, caindo para [] se corrompido.
  const parsed = PageBlocksSchema.safeParse(data.editor.blocks);
  const blocks = parsed.success ? parsed.data : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/paginas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-navy-900">{LABELS[pt]}</h1>
            <p className="text-xs text-navy-400">Construtor de página · {pt}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/p/${pt}` as never} target="_blank">
            <ExternalLink className="h-4 w-4" /> Ver página publicada
          </Link>
        </Button>
      </div>

      {!parsed.success && data.editor.source !== "empty" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Os blocos salvos estavam em formato inválido e foram descartados ao abrir.
        </p>
      )}

      <PageBuilderEditor
        pageType={pt}
        initialBlocks={blocks}
        source={data.editor.source}
        versions={data.versions}
        isLive={data.isLive}
        isArchived={data.isArchived}
      />
    </div>
  );
}
