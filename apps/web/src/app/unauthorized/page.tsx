import { Button } from "@nexora/ui";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-2xl font-bold text-navy-900">Acesso não permitido</h1>
      <p className="mb-6 max-w-md text-navy-500">
        Você não tem permissão para acessar esta área. Se acredita que isso é
        um erro, entre em contato com o administrador.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Voltar</Link>
        </Button>
      </div>
    </div>
  );
}
