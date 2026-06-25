# Nexora EDU

Plataforma de gestão educacional multi-tenant para instituições de ensino. Cada instituição tem seus próprios dados, configurações e portais — completamente isolados na mesma infraestrutura.

[![CI](https://github.com/O-Tiger/Nexora-EDU/actions/workflows/ci.yml/badge.svg)](https://github.com/O-Tiger/Nexora-EDU/actions/workflows/ci.yml)
[![License: ELv2](https://img.shields.io/badge/License-Elastic_v2-orange.svg)](LICENSE)

---

## Visão geral

Nexora EDU cobre dois eixos principais:

| Eixo | O que resolve |
|---|---|
| **EAD** | Cursos, módulos, aulas (vídeo / PDF / texto / ao vivo), progresso, certificados, avaliações com autocorreção |
| **Secretaria Escolar K-12** | Turmas, matrículas, grade de horários, boletim trimestral, diário de classe, frequência, financeiro |

Cada instituição (tenant) acessa o sistema pelo mesmo domínio com contexto isolado via JWT multi-tenant.

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
| Monitoramento | Sentry |

---

## Estrutura do monorepo

```
apps/
  web/               # Next.js — portais admin, professor, responsável e aluno
packages/
  auth/              # NextAuth config, middleware por role, rate limit
  db/                # Schema Prisma, migrations, seed, queries
  emails/            # Templates React Email
  notifications/     # Integração WhatsApp via Digisac
  ui/                # Componentes base + tokens de design
  validators/        # Schemas Zod compartilhados
```

---

## Início rápido

```bash
# 1. Clonar e instalar dependências
git clone https://github.com/O-Tiger/Nexora-EDU.git
cd Nexora-EDU
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local (veja docs/setup/environment-variables.md)

# 3. Subir banco e Redis
docker compose -f docker-compose.dev.yml up -d

# 4. Aplicar migrations e popular banco
npm run db:migrate
npm run db:seed

# 5. Rodar em desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`.

Credenciais de seed: `admin.a@nexora.edu` / `nexora@admin`

Documentação completa de setup: [docs/setup/local-development.md](docs/setup/local-development.md)

---

## Portais

| Portal | Rota | Acesso |
|---|---|---|
| Administrador | `/admin` | ADMINISTRATOR, OWNER |
| Professor | `/prof` | PROFESSOR (com cadastro interno vinculado) |
| Responsável | `/responsavel` | RESPONSIBLE |
| Aluno | `/aluno` | STUDENT |

---

## Documentação

| Documento | Descrição |
|---|---|
| [Setup local](docs/setup/local-development.md) | Pré-requisitos, Docker, seed, dev server |
| [Variáveis de ambiente](docs/setup/environment-variables.md) | Todas as env vars documentadas |
| [Banco de dados](docs/setup/database.md) | Migrations, reset, seed |
| [Arquitetura](docs/architecture/overview.md) | Visão geral do sistema |
| [Modelo de dados](docs/architecture/data-model.md) | Schema Prisma e relações |
| [Autenticação](docs/architecture/auth.md) | JWT, roles, multi-tenant |
| [Deploy — Railway](docs/deploy/railway.md) | Deploy e variáveis de produção |
| [Release workflow](docs/deploy/release-workflow.md) | SemVer, tags, CHANGELOG |
| [Boletim](docs/features/boletim.md) | Engine de geração de boletim |
| [Grade de horários](docs/features/horario.md) | Configuração e PDF |
| [Diário de classe](docs/features/diario-de-classe.md) | Registro de aulas e chamada |
| [Itinerário Formativo](docs/features/itinerario-formativo.md) | Trilhas por aluno |
| [Financeiro](docs/features/financeiro.md) | Mensalidades e status de pagamento |
| [Portal Professor](docs/features/portal-professor.md) | Notas e diário pelo portal /prof |
| [Portal Responsável](docs/features/portal-responsavel.md) | Boletim, frequência e mensalidades |

### Decisões de arquitetura (ADRs)

- [ADR-001](docs/architecture/ADR-001.md) — Multi-tenancy por coluna
- [ADR-002](docs/architecture/ADR-002.md) — Autenticação com NextAuth v5 + Argon2
- [ADR-003](docs/architecture/ADR-003.md) — Page Builder com slugs customizados (deferido)

---

## Comandos úteis

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Build de produção
npm run typecheck        # TypeScript em todos os pacotes
npm run lint             # ESLint
npm run test             # Vitest
npm run db:migrate       # Aplicar migrations pendentes
npm run db:seed          # Popular banco com dados de dev
npm run db:studio        # Abrir Prisma Studio
```

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o guia completo de contribuição.

Resumo:
1. Fork + branch a partir de `dev`
2. Siga o padrão de commits [Conventional Commits](https://www.conventionalcommits.org/)
3. `npm run typecheck && npm run lint` devem passar
4. Abra PR para `dev` — nunca direto para `main`

---

## Segurança

Para reportar vulnerabilidades, veja [SECURITY.md](SECURITY.md).

---

## Licença

Nexora EDU é distribuído sob a [Elastic License 2.0](LICENSE).

Uso pessoal e educacional: **gratuito**.
Uso comercial (hospedagem como serviço, revenda): **requer autorização do autor**.

© 2026 Paulo Schemidt (O-Tiger). Todos os direitos reservados.
