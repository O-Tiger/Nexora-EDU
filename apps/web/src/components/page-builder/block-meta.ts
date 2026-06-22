import type { LayoutBlock, BlockType } from "@nexora/validators";

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Destaque (Hero)",
  richText: "Texto rico",
  featureGrid: "Grade de recursos",
  courseList: "Lista de cursos",
  cta: "Chamada para ação",
  image: "Imagem",
  carousel: "Carrossel",
  spacer: "Espaçador",
};

export const BLOCK_PALETTE: BlockType[] = [
  "hero",
  "richText",
  "featureGrid",
  "courseList",
  "cta",
  "image",
  "carousel",
  "spacer",
];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Cria um bloco novo com props padrão coerentes com os defaults do Zod. */
export function makeBlock(type: BlockType): LayoutBlock {
  const id = newId();
  switch (type) {
    case "hero":
      return { id, type, title: "Bem-vindo", subtitle: "", ctaText: "", ctaHref: "", bgColor: "#1A3A5C", bgGradientDir: "to bottom" as const };
    case "richText":
      return { id, type, html: "<p>Escreva seu texto aqui.</p>" };
    case "featureGrid":
      return { id, type, title: "", items: [{ title: "Recurso", text: "" }] };
    case "courseList":
      return { id, type, title: "Nossos cursos", limit: 6 };
    case "cta":
      return { id, type, title: "Comece agora", text: "", buttonText: "Saiba mais", buttonHref: "", bgColor: "#0D9488", bgGradientDir: "to bottom" as const };
    case "image":
      return { id, type, src: "", alt: "" };
    case "carousel":
      return { id, type, title: "", slides: [{ src: "", alt: "", caption: "", href: "" }], autoplay: false, intervalMs: 5000 };
    case "spacer":
      return { id, type, size: "md" };
  }
}
