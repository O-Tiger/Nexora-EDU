"use client";

import { useEffect } from "react";
import { Button } from "@nexora/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry captura automaticamente via instrumentation — log manual aqui é redundante
    console.error("[GlobalError]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-2xl font-bold text-navy-900">Algo deu errado</h1>
      <p className="mb-6 max-w-md text-navy-500">
        Ocorreu um problema inesperado. Não se preocupe — seus dados estão
        seguros.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button variant="outline" asChild>
          <a href="/">Voltar ao início</a>
        </Button>
      </div>
      <p className="mt-6 text-sm text-navy-400">
        Se o problema persistir, entre em contato com o suporte.
      </p>
    </div>
  );
}
