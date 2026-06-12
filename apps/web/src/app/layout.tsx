import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import { BRAND, Toaster } from "@nexora/ui";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.tagline,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND.name,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* WCAG 2.1 SC 2.4.1 — skip repetitive navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Pular para o conteúdo principal
        </a>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
