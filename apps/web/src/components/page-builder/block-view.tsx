import React from "react";
import Link from "next/link";
import type { LayoutBlock, FeatureIcon } from "@nexora/validators";
import { sanitizeHtml } from "@/lib/sanitize";
import { Carousel } from "./carousel";
import {
  BookOpen, GraduationCap, Award, Users, Check, Star, Rocket, Heart, Shield,
  Clock, Calendar, Lightbulb, Target, Trophy, Globe, Laptop, Pencil, BarChart3,
  MessageSquare, Gift, type LucideIcon,
} from "lucide-react";

const FEATURE_ICON_MAP: Record<FeatureIcon, LucideIcon> = {
  book: BookOpen, graduation: GraduationCap, award: Award, users: Users, check: Check,
  star: Star, rocket: Rocket, heart: Heart, shield: Shield, clock: Clock,
  calendar: Calendar, lightbulb: Lightbulb, target: Target, trophy: Trophy, globe: Globe,
  laptop: Laptop, pencil: Pencil, chart: BarChart3, message: MessageSquare, gift: Gift,
};

// Componente PURO (sem APIs server-only nem async) — usado tanto pelo
// PageRenderer (server) quanto pelo preview do editor (client).

function bgStyle(bgColor: string, bgGradientTo?: string, bgGradientDir = "to bottom"): React.CSSProperties {
  if (bgGradientTo) {
    return { backgroundImage: `linear-gradient(${bgGradientDir}, ${bgColor}, ${bgGradientTo})` };
  }
  return { backgroundColor: bgColor };
}

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
        <section className="px-6 py-20 text-center text-white" style={bgStyle(block.bgColor, block.bgGradientTo, block.bgGradientDir)}>
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
              {block.items.map((item, i) => {
                const Icon = item.icon ? FEATURE_ICON_MAP[item.icon] : null;
                return (
                  <div key={i} className="rounded-lg border border-navy-100 bg-white p-6">
                    {Icon && (
                      <span className="mb-3 inline-flex rounded-lg bg-teal-50 p-2.5 text-teal-600">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-navy-900">{item.title}</h3>
                    {item.text && <p className="mt-2 text-sm text-navy-600">{item.text}</p>}
                  </div>
                );
              })}
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
        <section className="px-6 py-16 text-center text-white" style={bgStyle(block.bgColor, block.bgGradientTo, block.bgGradientDir)}>
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

    case "carousel": {
      const slides = block.slides.filter((s) => s.src);
      if (slides.length === 0) return null;
      return (
        <section className="px-6 py-10">
          {block.title && (
            <h2 className="mb-6 text-center text-2xl font-bold text-navy-900">{block.title}</h2>
          )}
          <Carousel slides={slides} autoplay={block.autoplay} intervalMs={block.intervalMs} />
        </section>
      );
    }

    case "spacer":
      return <div className={SPACER_H[block.size] ?? "h-12"} aria-hidden />;
  }
}
