import { z } from "zod";

// ─── Blocos do Page Builder ─────────────────────────────────────────────────
// Cada bloco é validado na API/Server Action via Zod — NUNCA confiar no JSON
// que vem do banco ou do client sem revalidar.

const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use formato #RRGGBB)");

// URL/href seguro: caminho interno (/...) ou http(s). Bloqueia javascript:, data:, etc.
const SafeHref = z
  .string()
  .max(2000)
  .refine(
    (v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v),
    "Link deve ser interno (/...) ou http(s)",
  );

const HeroBlock = z.object({
  type: z.literal("hero"),
  title: z.string().min(1).max(160),
  subtitle: z.string().max(400).default(""),
  ctaText: z.string().max(60).default(""),
  ctaHref: SafeHref.default(""),
  bgColor: HexColor.default("#1A3A5C"),
});

const RichTextBlock = z.object({
  type: z.literal("richText"),
  // HTML sanitizado no render — ver sanitizeHtml no PageRenderer.
  html: z.string().max(20000).default(""),
});

const FeatureItem = z.object({
  title: z.string().min(1).max(120),
  text: z.string().max(400).default(""),
});

const FeatureGridBlock = z.object({
  type: z.literal("featureGrid"),
  title: z.string().max(160).default(""),
  items: z.array(FeatureItem).min(1).max(12),
});

const CourseListBlock = z.object({
  type: z.literal("courseList"),
  title: z.string().max(160).default("Nossos cursos"),
  limit: z.number().int().min(1).max(24).default(6),
});

const CtaBlock = z.object({
  type: z.literal("cta"),
  title: z.string().min(1).max(160),
  text: z.string().max(400).default(""),
  buttonText: z.string().max(60).default("Saiba mais"),
  buttonHref: SafeHref.default(""),
  bgColor: HexColor.default("#0D9488"),
});

const ImageBlock = z.object({
  type: z.literal("image"),
  // Apenas http(s) ou caminho interno — evita SSRF/onload tricks.
  src: SafeHref.default(""),
  alt: z.string().max(200).default(""),
});

const SpacerBlock = z.object({
  type: z.literal("spacer"),
  size: z.enum(["sm", "md", "lg", "xl"]).default("md"),
});

/** União discriminada de todos os blocos suportados. */
export const LayoutBlockDataSchema = z.discriminatedUnion("type", [
  HeroBlock,
  RichTextBlock,
  FeatureGridBlock,
  CourseListBlock,
  CtaBlock,
  ImageBlock,
  SpacerBlock,
]);

/** Bloco completo com id estável (usado para reordenação drag-and-drop). */
export const LayoutBlockSchema = z.intersection(
  z.object({ id: z.string().min(1).max(64) }),
  LayoutBlockDataSchema,
);

/** Array de blocos de uma página — limite alto para evitar payloads abusivos. */
export const PageBlocksSchema = z.array(LayoutBlockSchema).max(50);

export const PAGE_TYPES = ["home", "course", "login", "certificate"] as const;
export const PageTypeSchema = z.enum(PAGE_TYPES);

export type LayoutBlockData = z.infer<typeof LayoutBlockDataSchema>;
export type LayoutBlock = z.infer<typeof LayoutBlockSchema>;
export type PageBlocks = z.infer<typeof PageBlocksSchema>;
export type PageType = z.infer<typeof PageTypeSchema>;
export type BlockType = LayoutBlockData["type"];
