# Financeiro

## Visão geral

O módulo financeiro gerencia as mensalidades dos alunos matriculados. Cada `TurmaEnrollment` pode ter uma ou mais `Mensalidade` associadas, com valor, vencimento e status de pagamento.

## Onde acessar

- Admin: `/admin/secretaria/alunos/[id]` → aba Financeiro
- Responsável: `/responsavel/mensalidades`

## Status de mensalidade

| Status | Descrição |
|---|---|
| `PENDENTE` | Em aberto, não vencida |
| `PAGO` | Pagamento confirmado |
| `VENCIDO` | Data de vencimento passou sem pagamento |
| `CANCELADO` | Mensalidade cancelada |

## Portal do Responsável

O responsável autenticado vê as mensalidades dos seus filhos agrupadas por mês. Cada mensalidade exibe:

- Descrição (ex: "Mensalidade — Julho/2026")
- Valor
- Vencimento
- Status com badge colorido

Quando há mensalidades em atraso, um banner de alerta é exibido no topo do portal.

## Dashboard admin

O dashboard da secretaria exibe:

- Gráfico de pizza por status (Pago / Pendente / Vencido / Cancelado)
- Gráfico de barras de receita por mês

## Arquivos relevantes

| Arquivo | Descrição |
|---|---|
| `packages/db/src/queries/financeiro.ts` | Queries de mensalidades |
| `apps/web/src/actions/financeiro.ts` | Server Actions |
| `apps/web/src/app/admin/secretaria/alunos/[studentId]/` | Ficha do aluno com financeiro |
| `apps/web/src/app/responsavel/mensalidades/` | Portal do responsável |
