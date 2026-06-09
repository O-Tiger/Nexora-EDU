# Nexora EDU

Plataforma EAD multi-tenant para instituições de ensino. Cada instituição (tenant) tem seus próprios cursos, alunos e configurações — completamente isolados.

[![CI](https://github.com/O-Tiger/Nexora-EDU/actions/workflows/ci.yml/badge.svg)](https://github.com/O-Tiger/Nexora-EDU/actions/workflows/ci.yml)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Auth | NextAuth.js v5 · Argon2 · JWT multi-tenant |
| Banco | PostgreSQL 16 · Prisma ORM |
| Cache / Rate limit | Upstash Redis |
| Storage | Cloudflare R2 (presigned URLs) |
| E-mail | Resend + React Email |
| Monorepo | Turborepo + npm workspaces |
| UI | Tailwind CSS + shadcn/ui |
| Erros | Sentry |

---

## Estrutura do monorepo

```
apps/
  web/               # Next.js — painéis admin, aluno e professor
packages/
  auth/              # NextAuth config, middleware por role, rate limit
  db/                # Schema Prisma, migrations, seed, queries
  emails/            # Templates React Email (matrícula, expiração, certificado)
  notifications/     # Contrato WhatsApp via Digisac (Fase 2)
  ui/                # Componentes base + tokens de design
  validators/        # Schemas Zod compartilhados
```

---

## Pré-requisitos

- Node.js ≥ 20
- npm ≥ 10
- Docker (para o banco e Redis em dev)

---

## Primeiros passos

```bash
# 1. Clonar e instalar
git clone https://github.com/O-Tiger/Nexora-EDU.git
cd Nexora-EDU
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais (veja a seção abaixo)

# 3. Subir banco e Redis
docker compose -f docker-compose.dev.yml up -d

# 4. Migrations + seed
npm run db:migrate
npm run db:seed

# 5. Gerar Prisma Client
cd packages/db && npx prisma generate && cd ../..

# 6. Rodar em dev
npm run dev          # Turbopack
npm run dev:webpack  # Webpack (fallback)
```

Acesse `http://localhost:3000`.

---

## Variáveis de ambiente

Todas as variáveis estão documentadas em `.env.example`. As obrigatórias para dev local:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | PostgreSQL — gerado pelo Docker: `postgresql://postgres:dev@localhost:5432/nexora_dev` |
| `NEXTAUTH_SECRET` | Chave JWT — gere com `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` em dev |
| `UPSTASH_REDIS_URL` | Redis local: `redis://localhost:6379` |
| `UPSTASH_REDIS_TOKEN` | Qualquer string em dev local |

As demais (R2, Resend, Sentry, Digisac, Omie, Groq) são opcionais em dev — o sistema usa fallbacks locais quando ausentes.

---

## Usuários do seed

| E-mail | Senha | Role | Tenant |
|---|---|---|---|
| `superadmin@nexora.edu` | `nexora@superadmin` | SUPER_ADMIN | — |
| `admin.a@nexora.edu` | `nexora@admin` | ADMIN | inst_a |
| `admin.b@nexora.edu` | `nexora@admin` | ADMIN | inst_b |
| `prof.a@nexora.edu` | `nexora@prof` | PROFESSOR | inst_a |
| `aluno1@nexora.edu` | `nexora@aluno` | ALUNO | inst_a |

---

## Comandos úteis

```bash
npm run typecheck        # TypeScript em todos os pacotes
npm run lint             # ESLint no apps/web
npm run test             # Vitest
npm run build            # Build de produção
npm run db:studio        # Prisma Studio
npm run db:migrate       # Aplicar migrations pendentes
npm run db:seed          # Popular banco com dados de dev
```

---

## O que está implementado

### Fase 0 — Infraestrutura
- Monorepo Turborepo com workspaces, Docker dev (PostgreSQL + Redis), CI/CD
- Auth multi-tenant: NextAuth v5, Argon2, JWT com `tenantId` + `role`, rate limit de login (5 tentativas/15 min)
- Schema Prisma completo com multi-tenancy por coluna (`tenantId`)
- Componentes base e tokens de design (navy `#1A3A5C`, teal `#0D9488`)

### Fase 1 — MVP EAD
- **Painel admin:** cursos (CRUD, drag-and-drop de módulos/aulas), alunos, matrículas, importação de cursos `.imscc` (formato NeoLMS/Common Cartridge)
- **Painel aluno:** player de aulas (vídeo, PDF, texto rico, link externo, ao vivo), progresso com cache Redis
- **Certificados:** geração com Puppeteer, armazenamento no R2, página pública de validação por código
- **Storage:** Cloudflare R2 com presigned URLs (15 min download / 5 min upload) + fallback local em dev
- **E-mails transacionais:** matrícula confirmada, expiração próxima, certificado emitido (Resend + React Email)
- **Cron:** endpoint para expirar matrículas vencidas (`POST /api/cron/enrollments`)

### Fase 2 — Em andamento
- ✅ **Page Builder:** editor visual drag-and-drop, 7 tipos de bloco, versionamento (10 versões + rollback), auditoria de publicações, `PageRenderer` server-side, rota pública `/p/[pageType]`
- ✅ **Avaliações:** questões de múltipla escolha, V/F e dissertativa; fórmula de nota configurável com `mathjs` (nunca `eval`); auto-correção de objetivas; correção manual de dissertativas; upload de entregas com validação por magic bytes
- ⬜ Comunicação + Digisac WhatsApp
- ⬜ LGPD (exportação de dados pessoais)
- ⬜ Aulas ao vivo (Zoom/Meet)
- ⬜ Omie ERP
- ⬜ PWA + i18n + WCAG 2.1 AA

---

## Branching

| Branch | Uso |
|---|---|
| `main` | Produção — merge via PR após CI verde |
| `dev` | Integração — features mergeiam aqui primeiro |
| `feat/*` | Features individuais |
| `fix/*` | Correções |
| `hotfix/*` | Correções urgentes de produção (branch de `main`) |

---

## Arquitetura

Decisões documentadas em [`docs/architecture/`](docs/architecture/):
- [ADR-001](docs/architecture/ADR-001.md) — Multi-tenancy por coluna vs. schema separado
- [ADR-002](docs/architecture/ADR-002.md) — NextAuth v5 + Argon2 como solução de autenticação
