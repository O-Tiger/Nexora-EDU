"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Calculator, Save } from "lucide-react";
import { saveGradeFormulaAction, previewFormulaAction } from "@/actions/assessments";

interface VarInfo {
  formulaVar: string;
  title: string;
}

interface Props {
  courseId: string;
  initialFormula: string;
  vars: VarInfo[];
}

export function GradeFormula({ courseId, initialFormula, vars }: Props) {
  const [formula, setFormula] = useState(initialFormula);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function doPreview() {
    startTransition(async () => {
      const r = await previewFormulaAction(courseId, formula);
      if ("error" in r) {
        setPreview(null);
        toast({ variant: "destructive", title: "Fórmula inválida", description: r.error });
        return;
      }
      const scopeStr = Object.entries(r.scope).map(([k, v]) => `${k}=${v}`).join(", ");
      setPreview(`Com ${scopeStr || "sem variáveis"} → nota final = ${Number(r.result.toFixed(2))}`);
    });
  }

  function save() {
    startTransition(async () => {
      const r = await saveGradeFormulaAction(courseId, formula);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      toast({ title: "Fórmula salva" });
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-navy-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-teal-600" />
        <h3 className="font-medium text-navy-900">Fórmula da nota final</h3>
      </div>

      {vars.length === 0 ? (
        <p className="text-sm text-navy-400">
          Defina a variável de fórmula (ex: <code>p1</code>) em cada avaliação para usá-las aqui.
        </p>
      ) : (
        <p className="text-xs text-navy-500">
          Variáveis disponíveis:{" "}
          {vars.map((v) => (
            <code key={v.formulaVar} className="mr-2 rounded bg-navy-50 px-1.5 py-0.5 text-navy-700">
              {v.formulaVar} = {v.title}
            </code>
          ))}
        </p>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-navy-500">Expressão (ex: (p1*0.4)+(p2*0.6))</Label>
        <Input value={formula} placeholder="(p1*0.4)+(p2*0.6)" maxLength={500} onChange={(e) => setFormula(e.target.value)} />
      </div>

      {preview && <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">{preview}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={doPreview} disabled={isPending || !formula.trim()}>
          <Calculator className="h-4 w-4" /> Pré-visualizar
        </Button>
        <Button size="sm" onClick={save} disabled={isPending}>
          <Save className="h-4 w-4" /> Salvar fórmula
        </Button>
      </div>
    </div>
  );
}
