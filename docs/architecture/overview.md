# Arquitetura — Visão Geral

## Diagrama de alto nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nexora EDU (Next.js 15)                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  /admin  │  │  /prof   │  │/responsavel │  │    /aluno    │  │
│  │ (ADMIN+) │  │(PROFESSOR)│ │(RESPONSIBLE)│  │  (STUDENT+)  │  │
│  └────┬─────┘  └────┬─────┘  └────┬───────┘   └──────┬───────┘  │
│       │             │             │                  │          │
│  ─────┴─────────────┴─────────────┴──────────────────┴──────    │
│                    Server Components + Server Actions           │
│  ─────────────────────────────────────────────────────────────  │
│          @nexora/auth    @nexora/db    @nexora/validators       │
└─────────────────────────────────────────────────────────────────┘
          │                   │
    ┌─────▼──────┐    ┌───────▼────────┐
    │ Upstash    │    │  PostgreSQL 16 │
    │ Redis      │    │  (via Prisma)  │
    └────────────┘    └────────────────┘
```

## Monorepo (Turborepo)

```
apps/
  web/               # Único app Next.js — todos os portais
packages/
  auth/              # Configuração NextAuth, middleware de roles
  db/                # Schema Prisma, migrations, seed, funções de query
  emails/            # Templates React Email (Resend)
  notifications/     # Contrato WhatsApp/Digisac
  ui/                # Componentes compartilhados (Button, Input, toast…)
  validators/        # Schemas Zod reutilizados entre app e actions
```

Cada `package/` é um workspace npm. O `apps/web` importa diretamente por path alias (`@nexora/db/src/queries/...`) — sem build step intermediário nos pacotes.

## Fluxo de request

```
Browser
  └─ Next.js Middleware (JWT check + role guard por prefixo de rota)
      └─ Server Component (página)
          ├─ Lê dados: queries Prisma diretas (sem camada HTTP)
          └─ Mutações: Server Actions
              ├─ Valida input (Zod)
              ├─ Extrai tenantId do JWT (nunca do body)
              └─ Executa query Prisma
```

## Multi-tenancy

Estratégia: **coluna `tenantId`** em todos os models de dados. Veja [ADR-001](ADR-001.md).

Regras:
1. Todo model com dados de tenant tem `tenantId String`
2. Todo Server Action extrai `tenantId` do JWT — nunca aceita do cliente
3. Todas as queries críticas filtram por `tenantId`

## Roles e portais

| Role | Portal | Acesso |
|---|---|---|
| `OWNER` | `/admin` | Todos os recursos do tenant |
| `ADMINISTRATOR` | `/admin` | Recursos administrativos e pedagógicos |
| `PROFESSOR` | `/prof` | Turmas que ministra, notas, diário |
| `RESPONSIBLE` | `/responsavel` | Dados dos filhos vinculados |
| `STUDENT` | `/aluno` | Próprios cursos e progresso |

O middleware em `packages/auth/src/middleware.ts` aplica as regras por prefixo de rota. Role insuficiente → redirect `/unauthorized`.

## Decisões documentadas

| ADR | Decisão |
|---|---|
| [ADR-001](ADR-001.md) | Multi-tenancy por coluna vs. schema separado |
| [ADR-002](ADR-002.md) | NextAuth v5 + Argon2 para autenticação |
| [ADR-003](ADR-003.md) | Page Builder com slugs customizados (deferido) |
