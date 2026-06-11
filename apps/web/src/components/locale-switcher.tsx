"use client";

import { useTransition } from "react";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { useLocale } from "next-intl";

const localeLabels: Record<Locale, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
};

export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  function switchLocale(locale: Locale) {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
      window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Idioma">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          disabled={isPending || locale === currentLocale}
          aria-current={locale === currentLocale ? "true" : undefined}
          aria-label={`Mudar idioma para ${localeLabels[locale]}`}
          className={
            locale === currentLocale
              ? "rounded px-1.5 py-0.5 text-xs font-bold text-teal-700 bg-teal-50"
              : "rounded px-1.5 py-0.5 text-xs text-navy-400 hover:text-navy-700 disabled:opacity-50"
          }
        >
          {localeLabels[locale]}
        </button>
      ))}
    </div>
  );
}
