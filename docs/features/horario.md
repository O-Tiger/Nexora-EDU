# Grade de Horários

## Visão geral

A grade de horários define quais disciplinas são ministradas em cada dia e horário para uma turma. Suporta aulas **semanais** e **quinzenais** (semanas pares e ímpares).

## Onde acessar

`/admin/secretaria/turmas/[id]/horario`

## Configuração

### Slots de horário

Antes de montar a grade, configure os horários do dia (slots):

- Quantos horários por dia (ex: 5 horários)
- Início e fim de cada horário (ex: 07:30–08:15)
- Se inclui sábado

Essa configuração é salva em `Turma.horarioConfig` (JSON).

### Frequência das aulas

Cada célula da grade pode ser:

| Frequência | Descrição |
|---|---|
| `SEMANAL` | Ocorre toda semana |
| `QUINZENAL_PAR` | Ocorre nas semanas com número ISO par |
| `QUINZENAL_IMPAR` | Ocorre nas semanas com número ISO ímpar |

Para aulas quinzenais, o mesmo slot de dia+horário pode ter tanto `QUINZENAL_PAR` quanto `QUINZENAL_IMPAR` — elas aparecem empilhadas com badges "Par" (âmbar) e "Ímpar" (violeta).

### Professor por disciplina

Na grade, cada célula exibe o professor vinculado à disciplina naquela turma. O vínculo é feito em `/admin/secretaria/professores` ou na própria página de horário.

## Exportação PDF

A grade pode ser exportada em PDF no formato paisagem. O PDF replica a grade visual com cores, nomes de disciplina e professores.

Endpoint: `GET /api/secretaria/horario?turmaId=...&format=pdf`

## Diário de classe e paridade semanal

O diário de classe usa os dados da grade de horários para filtrar as disciplinas disponíveis no momento do lançamento de aula. Ao selecionar uma data:

1. O dia da semana é determinado (Segunda = 1, …, Sábado = 6)
2. A paridade ISO da semana é calculada (par/ímpar)
3. Apenas disciplinas com aulas `SEMANAL` ou `QUINZENAL_PAR/IMPAR` compatíveis aparecem no select

Se não houver grade configurada para a turma, todas as disciplinas são exibidas (fallback).

## Arquivos relevantes

| Arquivo | Descrição |
|---|---|
| `packages/db/src/queries/horario.ts` | Queries: getHorario, setHorario, getHorarioRenderData |
| `apps/web/src/app/admin/secretaria/turmas/[id]/horario/` | Página de configuração da grade |
| `apps/web/src/components/secretaria/horario-grid.tsx` | Componente visual da grade |
| `apps/web/src/app/api/secretaria/horario/route.ts` | Endpoint de exportação PDF |
| `apps/web/src/app/prof/horario/` | Visualização no portal do professor |
