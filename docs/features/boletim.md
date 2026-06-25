# Boletim Escolar

## Visão geral

O boletim é gerado a partir das notas e frequências lançadas na turma. Pode ser exportado em **PDF**, **HTML** ou **Word (.doc)**, por turma inteira ou aluno individual.

## Estrutura trimestral

Cada disciplina tem colunas por trimestre (1º, 2º, 3º) e tipos de avaliação:

| Código | Nome | Período | Tipo |
|---|---|---|---|
| `1-AVA` | 1ª Avaliação | 1 | AVA |
| `2-AVA` | 2ª Avaliação | 2 | AVA |
| `3-AVA` | 3ª Avaliação | 3 | AVA |
| `0-RECP` | Recuperação | 0 | RECP |
| `0-FINAL` | Prova Final | 0 | FINAL |

A média é calculada pela engine de boletim com base nas notas lançadas. O resultado final (Aprovado / Recuperação / Reprovado) é determinado automaticamente.

## Onde acessar (admin)

- `/admin/secretaria/boletins` — gerador de boletim da turma inteira ou aluno individual
- `/admin/secretaria/turmas/[id]/notas` — lançamento de notas por turma

## Frentes e modo de exibição

Disciplinas com sub-frentes (ex: Matemática → "Matemática 1", "Matemática 2") são exibidas em dois modos:

| Modo | Comportamento |
|---|---|
| `avulsas` | Cada frente aparece como linha própria, indentada |
| `media` | Frentes consolidadas na disciplina-mãe pela média das células |

O modo é configurável na geração do boletim.

## Itinerário Formativo

Para disciplinas marcadas como `isItinerario = true` (ex: IFO), cada aluno vê apenas a frente (trilha) que escolheu. As demais frentes são filtradas na geração. Veja [itinerario-formativo.md](itinerario-formativo.md).

## Faltas no boletim

- Se a turma tem **diário de classe** lançado: faltas vêm do diário (contagem de `PresencaAluno`)
- Se não tem diário: faltas vêm da tabela `Attendance` (lançamento manual)
- Total de faltas é exibido por disciplina e como total geral no rodapé do boletim

## API — boletim do responsável

`GET /api/responsavel/boletim?turmaId=...&enrollmentId=...&format=pdf`

Requer autenticação com role `RESPONSIBLE`. Verifica ownership (o aluno deve ser filho do responsável logado) antes de gerar.

## Geração em PDF

O boletim PDF é gerado com Puppeteer (headless Chrome). Em desenvolvimento local, Puppeteer pode precisar de configuração adicional para encontrar o binário do Chrome.

Variáveis relevantes (sem necessidade de configurar em dev padrão):
- `PUPPETEER_EXECUTABLE_PATH` — caminho para o Chrome, se necessário

## Arquivos relevantes

| Arquivo | Descrição |
|---|---|
| `apps/web/src/lib/boletim.ts` | Engine de HTML e renderização PDF |
| `packages/db/src/queries/pedagogico.ts` → `getBoletimData` | Query que monta os dados |
| `apps/web/src/app/admin/secretaria/boletins/` | Página de geração admin |
| `apps/web/src/app/api/responsavel/boletim/route.ts` | API do portal responsável |
| `apps/web/src/app/responsavel/boletim/` | Visualização no portal responsável |
