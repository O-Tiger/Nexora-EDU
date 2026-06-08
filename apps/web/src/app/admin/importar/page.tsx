import type { Metadata } from "next";
import { ImsccImporter } from "@/components/admin/imscc-importer";

export const metadata: Metadata = { title: "Importar Curso (.imscc)" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Importar curso</h1>
        <p className="text-sm text-navy-500">
          Importe um curso no formato IMS Common Cartridge (.imscc). Módulos, aulas e PDFs serão
          criados automaticamente.
        </p>
      </div>
      <ImsccImporter />
    </div>
  );
}
