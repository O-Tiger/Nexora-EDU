# Portal do Professor

## Visão geral

O portal `/prof` permite que professores visualizem suas turmas, lancem notas e registrem aulas no diário de classe — com acesso restrito apenas às disciplinas que ministram.

## Pré-requisitos de acesso

Para acessar o portal, o usuário precisa:

1. Ter role `PROFESSOR` no tenant (vínculo em `TenantMembership`)
2. Ter um cadastro interno de `Professor` vinculado ao seu `User` via `Professor.userId`

O admin realiza o vínculo em `/admin/secretaria/professores` → botão "Vincular login".

Se o usuário tem role PROFESSOR mas não tem cadastro interno vinculado → redirect para `/unauthorized`.

## Páginas

### Dashboard (`/prof`)

Exibe um resumo do dia:
- Turmas ativas do professor
- Aulas do dia (baseadas na grade de horários)
- Atalhos para notas e diário

### Minhas Turmas (`/prof/turmas`)

Lista todas as turmas onde o professor tem pelo menos uma disciplina vinculada (`TurmaDisciplina.professorId`).

### Detalhe da Turma (`/prof/turmas/[id]`)

- Lista de alunos matriculados
- Botões de acesso a Notas e Diário

### Lançar Notas (`/prof/turmas/[id]/notas`)

Mesmo componente `NotasGrid` do admin, com duas diferenças:
- Apenas as disciplinas que o professor ministra aparecem no select
- O painel de configuração de disciplinas da turma está oculto (`canManageDisciplinas={false}`)

### Diário de Classe (`/prof/turmas/[id]/diario`)

Mesmo componente `DiarioManager` do admin:
- Apenas os registros das disciplinas do professor são exibidos
- O filtro de paridade semanal usa apenas os slots da grade do professor

### Grade de Horários (`/prof/horario`)

Exibe a grade semanal de todas as turmas do professor, com células PAR/ÍMPAR empilhadas quando aplicável.

## Segurança / Isolamento

- Todas as queries filtram por `professorId = professor.id` — professor não vê dados de outros professores
- O `professor.id` é obtido via `getProfessorByUserId(userId, tenantId)` — nunca aceito do cliente
- Redirect para `/unauthorized` se o professor tentar acessar uma turma onde não ministra

## Arquivos relevantes

| Arquivo | Descrição |
|---|---|
| `packages/db/src/queries/professores.ts` → `getProfessorByUserId`, `getMinhasTurmas` | Queries do portal |
| `apps/web/src/app/prof/` | Todas as páginas do portal |
| `apps/web/src/components/secretaria/notas-grid.tsx` | Grade de notas (prop `canManageDisciplinas`) |
| `apps/web/src/components/secretaria/diario-manager.tsx` | Diário (prop `horarioSlots`) |
