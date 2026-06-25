# Diário de Classe

## Visão geral

O diário de classe registra as aulas ministradas (conteúdo, data, quantidade de aulas) e a chamada dos alunos por aula. As faltas registradas no diário alimentam automaticamente o boletim e o portal do responsável.

## Onde acessar

- Admin: `/admin/secretaria/turmas/[id]/diario`
- Professor: `/prof/turmas/[id]/diario`

## Registro de aula

Cada `RegistroAula` contém:

| Campo | Descrição |
|---|---|
| Disciplina | Qual disciplina foi ministrada |
| Data | Data da aula |
| Quantidade de aulas | Quantas aulas geminadas (ex: 2 aulas no mesmo bloco) |
| Conteúdo | Descrição do conteúdo ministrado |
| Observações | Campo livre opcional |

## Chamada

Após registrar a aula, é feita a chamada dos alunos matriculados na turma. Para cada aluno:

- **Presente** — sem falta
- **Falta** — conta como falta (pode ser de 1 a N, onde N é o número de aulas geminadas)
- **Justificada** — registrada mas não contabilizada no total de faltas

A contagem de faltas é feita por aluno, por disciplina, acumulada no boletim.

## Filtro de disciplinas por paridade semanal

Ao selecionar uma data para lançamento, o sistema filtra automaticamente as disciplinas disponíveis com base na grade de horários:

1. Identifica o dia da semana da data selecionada
2. Calcula a paridade da semana ISO (par/ímpar)
3. Exibe apenas disciplinas com aulas `SEMANAL` ou `QUINZENAL_PAR/IMPAR` compatíveis com aquele dia e semana
4. Mostra um badge informativo "Semana par (semana 26)" quando há aulas quinzenais

Se a turma não tiver grade configurada, todas as disciplinas são exibidas.

## Faltas no boletim

Quando a turma tem pelo menos um `RegistroAula` lançado:
- As faltas do boletim vêm exclusivamente do diário
- Alunos sem falta registrada têm `0` faltas automaticamente
- Faltas justificadas não são somadas ao total

Sem diário lançado, o boletim usa as faltas manuais da tabela `Attendance`.

## Permissões

- **Admin/OWNER**: acesso completo a todas as disciplinas da turma
- **Professor**: vê e edita apenas as disciplinas que ministra na turma (filtrado por `TurmaDisciplina.professorId`)

## Arquivos relevantes

| Arquivo | Descrição |
|---|---|
| `packages/db/src/queries/diario.ts` | CRUD de registros, getFaltasFromDiario |
| `apps/web/src/components/secretaria/diario-manager.tsx` | Componente principal com filtro de paridade |
| `apps/web/src/app/admin/secretaria/turmas/[id]/diario/` | Página admin |
| `apps/web/src/app/prof/turmas/[id]/diario/` | Página do portal professor |
| `apps/web/src/actions/diario.ts` | Server Actions de criação/exclusão |
