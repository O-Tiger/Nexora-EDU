# Portal do Responsável

## Visão geral

O portal `/responsavel` permite que pais e responsáveis acompanhem o desempenho escolar dos seus filhos: notas, frequência, mensalidades e agenda de eventos.

## Pré-requisitos de acesso

O responsável precisa ter:
1. Conta `User` com role `RESPONSIBLE` no tenant
2. Pelo menos um vínculo `Guardian` com um aluno (`Guardian.userId = user.id`)

O admin cria o vínculo na ficha do aluno em `/admin/secretaria/alunos/[id]` → Responsáveis.

## Múltiplos filhos

Famílias com mais de um filho matriculado veem um **seletor de filho** no topo da sidebar. Trocar de filho atualiza todas as páginas via query param `?studentId=<id>`.

A sidebar exibe nome e turma do filho selecionado.

## Páginas

### Início (`/responsavel`)

Painel com resumo:
- Dados do filho (nome, turma, ano letivo)
- Mensalidades em atraso (banner de alerta)
- Próximos eventos da turma

### Boletim (`/responsavel/boletim`)

Exibe as notas do filho por disciplina e trimestre, com:
- Colunas: 1ª AVA, 2ª AVA, 3ª AVA, Recuperação, Prova Final, Média
- Resultado final (Aprovado / Em recuperação / Reprovado)
- Total de faltas no rodapé
- Botão **"Baixar PDF"** — gera e faz download do boletim em PDF

Para disciplinas de Itinerário Formativo: exibe apenas a trilha escolhida pelo aluno.

#### Download do boletim

O PDF é gerado via `GET /api/responsavel/boletim?turmaId=...&enrollmentId=...&format=pdf`.

A rota verifica que o `turmaId` pertence a um filho do responsável logado (proteção IDOR) antes de gerar.

### Frequência (`/responsavel/frequencia`)

Exibe faltas por disciplina:
- Contagem de faltas e total de aulas registradas
- Barra de progresso visual
- Alerta em vermelho para disciplinas com mais de 25% de faltas

### Mensalidades (`/responsavel/mensalidades`)

Lista de mensalidades com status (Pago, Pendente, Vencido), valor e vencimento. Banner de alerta quando há atraso.

### Calendário (`/responsavel/calendario`)

Eventos cadastrados pela secretaria para a turma (provas, reuniões, feriados, eventos). Exibidos em lista cronológica separada por mês.

## Segurança

- `getFilhosFromSession(userId, tenantId)` retorna apenas filhos do responsável logado
- Todas as páginas verificam que o filho selecionado pertence ao responsável
- O endpoint de PDF verifica ownership antes de gerar (IDOR guard)
- Nenhum `studentId` ou `turmaId` é aceito sem verificação de ownership

## Arquivos relevantes

| Arquivo | Descrição |
|---|---|
| `apps/web/src/lib/responsavel.ts` → `getFilhosFromSession`, `pickFilho` | Helpers do portal |
| `apps/web/src/app/responsavel/` | Todas as páginas |
| `apps/web/src/components/responsavel/responsavel-sidebar.tsx` | Sidebar com seletor de filhos |
| `apps/web/src/app/api/responsavel/boletim/route.ts` | API de download do boletim |
