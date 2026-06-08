import { getCourses } from "@nexora/db/src/queries/courses";
import type { LayoutBlock } from "@nexora/validators";
import { BlockView } from "./block-view";

interface Props {
  blocks: LayoutBlock[];
  tenantId: string;
}

/**
 * Renderiza server-side um array de blocos do Page Builder.
 * Blocos dinâmicos (courseList) buscam dados reais no servidor.
 */
export async function PageRenderer({ blocks, tenantId }: Props) {
  // Pré-carrega cursos só se algum bloco precisar (evita query desnecessária).
  const needsCourses = blocks.some((b) => b.type === "courseList");
  const courses = needsCourses ? await getCourses(tenantId, "PUBLISHED") : [];

  return (
    <div className="w-full">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} courses={courses} />
      ))}
    </div>
  );
}
