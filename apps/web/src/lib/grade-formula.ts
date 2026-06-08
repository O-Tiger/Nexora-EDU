import { create, all, type MathNode } from "mathjs";

// Avaliador seguro de fórmulas de nota.
// Regra de ouro (CLAUDE.md / spec): NUNCA usar eval(). A expressão é tratada
// como entrada não confiável — parseada, validada contra um allowlist e só então
// avaliada com mathjs num escopo restrito.

const math = create(all, {});

// Desabilita funcionalidades perigosas do mathjs (carregamento de código, units etc.)
math.import(
  {
    import: function () {
      throw new Error("desabilitado");
    },
    createUnit: function () {
      throw new Error("desabilitado");
    },
    evaluate: function () {
      throw new Error("desabilitado");
    },
    parse: function () {
      throw new Error("desabilitado");
    },
    simplify: function () {
      throw new Error("desabilitado");
    },
    derivative: function () {
      throw new Error("desabilitado");
    },
  },
  { override: true },
);

const ALLOWED_FUNCTIONS = new Set([
  "min", "max", "round", "abs", "floor", "ceil", "sqrt", "pow",
]);
const MAX_LEN = 500;

export type FormulaCheck = { ok: true } | { ok: false; error: string };

/**
 * Valida que a fórmula só usa as variáveis permitidas, números, operadores e
 * um conjunto restrito de funções matemáticas. Rejeita atribuições e símbolos
 * desconhecidos.
 */
export function validateFormula(formula: string, allowedVars: string[]): FormulaCheck {
  const trimmed = formula.trim();
  if (!trimmed) return { ok: false, error: "Fórmula vazia" };
  if (trimmed.length > MAX_LEN) return { ok: false, error: "Fórmula muito longa" };

  let node: MathNode;
  try {
    node = math.parse(trimmed);
  } catch {
    return { ok: false, error: "Sintaxe inválida" };
  }

  const allowed = new Set(allowedVars);
  let bad: string | null = null;

  node.traverse((n) => {
    if (bad) return;
    if (n.type === "AssignmentNode" || n.type === "FunctionAssignmentNode") {
      bad = "Atribuições não são permitidas";
    } else if (n.type === "FunctionNode") {
      const name = (n as unknown as { fn?: { name?: string } }).fn?.name ?? "";
      if (!ALLOWED_FUNCTIONS.has(name)) bad = `Função não permitida: ${name}`;
    } else if (n.type === "SymbolNode") {
      const name = (n as unknown as { name: string }).name;
      if (!allowed.has(name) && !ALLOWED_FUNCTIONS.has(name)) {
        bad = `Variável desconhecida: ${name}`;
      }
    }
  });

  if (bad) return { ok: false, error: bad };
  return { ok: true };
}

/**
 * Avalia a fórmula com o escopo fornecido. Lança se inválida ou se o resultado
 * não for um número finito.
 */
export function evaluateFormula(formula: string, scope: Record<string, number>): number {
  const check = validateFormula(formula, Object.keys(scope));
  if (!check.ok) throw new Error(check.error);

  const result = math.evaluate(formula.trim(), { ...scope });
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Resultado da fórmula inválido");
  }
  return result;
}
