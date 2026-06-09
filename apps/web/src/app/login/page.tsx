import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@nexora/ui";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-navy-900">{BRAND.name}</h1>
          <p className="mt-1 text-sm text-navy-500">{BRAND.tagline}</p>
        </div>
        {/* Suspense necessário porque LoginForm usa useSearchParams() */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
