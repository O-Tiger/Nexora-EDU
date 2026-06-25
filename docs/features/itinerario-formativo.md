# Itinerário Formativo

## O que é

O Itinerário Formativo (IF) é uma modalidade de disciplina eletiva prevista no Novo Ensino Médio brasileiro. Cada aluno escolhe uma **trilha** (ex: Marketing, Tecnologia, Saúde) dentro da mesma disciplina. As notas são lançadas pela trilha, e cada aluno vê apenas a sua no boletim.

## Modelo de dados

```
Disciplina (isItinerario = true)   ← ex: "IFO"
  └─ frentes: Disciplina[]         ← ex: "Marketing", "Tecnologia", "Saúde"

EnrollmentFrente
  ├─ enrollmentId → TurmaEnrollment   (qual aluno)
  ├─ disciplinaId → Disciplina (pai)  (qual disciplina IF)
  └─ frenteId     → Disciplina (frente) (trilha escolhida)
  @@unique([enrollmentId, disciplinaId])
```

## Como configurar (passo a passo)

### 1. Marcar a disciplina como Itinerário

Em `/admin/secretaria/disciplinas`:
- Clique no botão **"+ itinerário"** ao lado da disciplina IFO
- O badge âmbar "Itinerário" aparece confirmando

### 2. Criar as frentes (trilhas)

Na mesma página, clique **"+ frente"** na disciplina IFO e crie:
- Marketing
- Tecnologia
- Saúde
- (outras conforme a escola)

### 3. Vincular frentes à turma

Em `/admin/secretaria/turmas/[id]/notas` → seção "Disciplinas da turma":
- Adicione as frentes (ex: "IFO › Marketing", "IFO › Tecnologia") — **não** a disciplina pai
- Salve

### 4. Atribuir trilhas aos alunos

Na mesma página de notas, o painel **"Itinerário Formativo — atribuição de trilhas"** aparece automaticamente acima da grade:
- Para cada disciplina IF vinculada à turma, uma tabela mostra todos os alunos com um select
- Selecione a trilha de cada aluno
- A atribuição é salva automaticamente ao mudar o select

### 5. Lançar notas

Na grade de notas, ao selecionar "IFO › Marketing":
- Apenas alunos com trilha "Marketing" têm células editáveis
- Alunos em outras trilhas ficam com células desabilitadas (opacidade reduzida) e exibem o nome da trilha deles ao lado do nome
- Alunos sem trilha atribuída ficam com o texto "sem trilha" — atribua antes de lançar

## Boletim

Na geração do boletim, cada aluno vê:
- Apenas a frente da sua trilha (ex: "Marketing" indentada sob "IFO")
- Alunos sem trilha atribuída não recebem nenhuma linha IF no boletim

## Estrutura de avaliação

A estrutura de notas (1ª AVA, 2ª AVA, 3ª AVA, REC, Prova Final) é a mesma das demais disciplinas. Não há lógica especial de avaliação — apenas a restrição de qual aluno pode receber notas em qual frente.

## Arquivos relevantes

| Arquivo | Descrição |
|---|---|
| `packages/db/src/queries/pedagogico.ts` → `getEnrollmentFrentes`, `setEnrollmentFrente` | Queries de atribuição |
| `apps/web/src/components/secretaria/itinerario-panel.tsx` | Painel de atribuição de trilhas |
| `apps/web/src/components/secretaria/notas-grid.tsx` | Lógica de bloqueio de células |
| `apps/web/src/components/secretaria/disciplinas-manager.tsx` | Toggle isItinerario |
| `apps/web/src/actions/pedagogico.ts` → `setEnrollmentFrenteAction` | Server Action |
| `packages/db/prisma/schema.prisma` → `EnrollmentFrente` | Model de dados |
