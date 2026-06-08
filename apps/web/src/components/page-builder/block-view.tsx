import Link from "next/link";
import type { LayoutBlock } from "@nexora/validators";
import { sanitizeHtml } from "@/lib/sanitize";

// Componente PURO (sem APIs server-only nem async) — usado tanto pelo
// PageRenderer (server) quanto pelo preview do editor (client).

const SPACER_H: Record<string, string> = {
  sm: "h-6",
  md: "h-12",
  lg: "h-20",
  xl: "h-32",
};

export type CourseCard = { id: string; slug: string; title: string; description: string | null };

export function BlockView({ block, courses }: { block: LayoutBlock; courses: CourseCard[] }) {
  switch (block.type) {
    case "hero":
      return (
        <section className="px-6 py-20 text-center text-white" style={{ backgroundColor: block.bgColor }}>
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">{block.title}</h1>
            {block.subtitle && (
              <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">{block.subtitle}</p>
            )}
            {block.ctaText && block.ctaHref && (
              <Link
                href={block.ctaHref as never}
                className="mt-8 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-navy-50"
              >
                {block.ctaText}
              </Link>
            )}
          </div>
        </section>
      );

    case "richText":
      return (
        <section className="px-6 py-10">
          <div
            className="prose prose-navy mx-auto max-w-3xl"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
          />
        </section>
      );

    case "featureGrid":
      return (
        <section className="px-6 py-14">
          <div className="mx-auto max-w-5xl">
            {block.title && (
              <h2 className="mb-8 text-center text-2xl font-bold text-navy-900">{block.title}</h2>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {block.items.map((item, i) => (
                <div key={i} className="rounded-lg border border-navy-100 bg-white p-6">
                  <h3 className="text-lg font-semibold text-navy-900">{item.title}</h3>
                  {item.text && <p className="mt-2 text-sm text-navy-600">{item.text}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "courseList": {
      const shown = courses.slice(0, block.limit);
      return (
        <section className="px-6 py-14">
          <div className="mx-auto max-w-5xl">
            {block.title && (
              <h2 className="mb-8 text-center text-2xl font-bold text-navy-900">{block.title}</h2>
            )}
            {shown.length === 0 ? (
              <p className="text-center text-navy-400">Nenhum curso disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((c) => (
                  <Link
                    key={c.id}
                    href={`/aluno/cursos/${c.slug}` as never}
                    className="block rounded-lg border border-navy-100 bg-white p-6 transition hover:border-teal-300 hover:shadow-sm"
                  >
                    <h3 className="text-lg font-semibold text-navy-900">{c.title}</h3>
                    {c.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-navy-600">{c.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    case "cta":
      return (
        <section className="px-6 py-16 text-center text-white" style={{ backgroundColor: block.bgColor }}>
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{block.title}</h2>
            {block.text && <p className="mt-3 opacity-90">{block.text}</p>}
            {block.buttonText && block.buttonHref && (
              <Link
                href={block.buttonHref as never}
                className="mt-6 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-navy-50"
              >
                {block.buttonText}
              </Link>
            )}
          </div>
        </section>
      );

    case "image":
      if (!block.src) return null;
      return (
        <section className="px-6 py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt} className="mx-auto max-w-full rounded-lg" loading="lazy" />
        </section>
      );

    case "spacer":
      return <div className={SPACER_H[block.size] ?? "h-12"} aria-hidden />;
  }
}
