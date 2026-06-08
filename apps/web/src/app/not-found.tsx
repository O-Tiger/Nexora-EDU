import { Button } from "@nexora/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-2xl font-bold text-navy-900">Página não encontrada</h1>
      <p className="mb-6 max-w-md text-navy-500">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
