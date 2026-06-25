"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CarouselSlide {
  src: string;
  alt: string;
  caption: string;
  href: string;
}

interface Props {
  slides: CarouselSlide[];
  autoplay: boolean;
  intervalMs: number;
}

export function Carousel({ slides, autoplay, intervalMs }: Props) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback((i: number) => setIndex((i + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);

  useEffect(() => {
    if (!autoplay || count <= 1) return;
    const id = setInterval(next, intervalMs);
    return () => clearInterval(id);
  }, [autoplay, count, intervalMs, next]);

  if (count === 0) return null;
  const slide = slides[index]!;

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={slide.src} alt={slide.alt} className="h-full w-full object-cover" loading="lazy" />
  );

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-lg" role="group" aria-roledescription="carrossel">
      <div className="relative aspect-[16/7] w-full bg-navy-100">
        {slide.href ? <Link href={slide.href as never} aria-label={slide.alt || "slide"}>{img}</Link> : img}
        {slide.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-sm font-medium text-white">
            {slide.caption}
          </div>
        )}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-navy-900 shadow hover:bg-white focus-ring"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-navy-900 shadow hover:bg-white focus-ring"
            aria-label="Próximo slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-2 w-2 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/50"}`}
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
