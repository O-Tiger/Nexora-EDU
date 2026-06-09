"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, cn } from "@nexora/ui";
import { LoginSchema } from "@nexora/validators";

type Step = "credentials" | "tenant";

type TenantOption = {
  tenantId: string;
  role: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenantLabels: Record<string, string> = {
    inst_a: "Faculdade",
    inst_b: "Colégio",
  };

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);

    // Primeiro login sem tenantId para descobrir os tenants disponíveis
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      // Mensagem genérica — nunca revelar se o email existe
      setError("Email ou senha incorretos. Tente novamente.");
      return;
    }

    // Buscar tenants do usuário autenticado para exibir seletor se necessário
    const sessionRes = await fetch("/api/auth/session");
    const session = (await sessionRes.json()) as {
      user?: { availableTenants?: TenantOption[] };
    };

    const available = session?.user?.availableTenants ?? [];

    if (available.length <= 1) {
      router.push(callbackUrl as never);
      router.refresh();
      return;
    }

    // Múltiplos tenants — exibir seletor
    setTenants(available);
    setStep("tenant");
  }

  async function handleTenantSelect(tenantId: string) {
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      tenantId,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Não foi possível acessar esta instituição. Tente novamente.");
      return;
    }

    router.push(callbackUrl as never);
    router.refresh();
  }

  if (step === "tenant") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selecione a instituição</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {tenants.map((t) => (
            <button
              key={`${t.tenantId}-${t.role}`}
              onClick={() => void handleTenantSelect(t.tenantId)}
              disabled={loading}
              className={cn(
                "flex w-full flex-col rounded-md border border-navy-200 px-4 py-3 text-left transition-colors hover:border-teal-500 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50",
              )}
            >
              <span className="font-medium text-navy-900">
                {tenantLabels[t.tenantId] ?? t.tenantId}
              </span>
              <span className="text-xs text-navy-500 capitalize">
                {t.role.toLowerCase()}
              </span>
            </button>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleCredentials(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-navy-700">
              Email <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-navy-700">
              Senha <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
