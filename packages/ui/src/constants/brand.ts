export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Nexora EDU",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? "Educação sem fronteiras",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "",
  docsUrl: process.env.NEXT_PUBLIC_DOCS_URL ?? "",
} as const;
