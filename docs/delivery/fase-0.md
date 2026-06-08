# Relatório de Entrega — Fase 0: Infraestrutura

**Data:** 2026-06-02  
**Responsável:** Paulo (O-Tiger)  
**Status:** Concluído — pronto para validação

---

## O que foi construído

### Arquivos criados

```
/
├── package.json                          # Monorepo npm workspaces + Turborepo
├── turbo.json                            # Pipeline de tasks (dev, build, typecheck, lint, test)
├── tsconfig.base.json                    # TypeScript strict compartilhado
├── .gitignore
├── .env.example                          # Todas as variáveis documentadas (sem valores)
├── docker-compose.dev.yml               # PostgreSQL 16 + Redis 7
├── CHANGELOG.md
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       └── src/
│           ├── middleware.ts             # Re-exporta middleware do packages/auth
│           ├── app/
│           │   ├── layout.tsx            # Root layout com metadados Nexora EDU
│           │   ├── page.tsx              # Redirect baseado em role
│           │   ├── globals.css           # Tailwind + tokens CSS
│           │   ├── error.tsx             # Página de erro global
│           │   ├── not-found.tsx         # Página 404
│           │   ├── login/page.tsx        # Página de login
│           │   ├── admin/page.tsx        # Stub dashboard admin
│           │   ├── aluno/page.tsx        # Stub dashboard aluno
│           │   ├── prof/page.tsx         # Stub dashboard professor
│           │   ├── unauthorized/page.tsx # Página 403
│           │   └── api/auth/[...nextauth]/route.ts
│           └── components/
│               └── auth/login-form.tsx   # Formulário + seletor de tenant
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/schema.prisma          # Schema completo (10 models)
│   │   └── src/
│   │       ├── client.ts                 # Prisma client singleton
│   │       ├── index.ts
│   │       ├── seed.ts                   # 9 usuários + 2 tenants + curso de exemplo
│   │       └── queries/
│   │           ├── users.ts
│   │           └── enrollments.ts
│   ├── auth/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── config.ts                 # NextAuth v5 + Argon2 + JWT multi-tenant
│   │       ├── middleware.ts             # Proteção de rotas por role
│   │       └── index.ts
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts            # Tokens navy + teal
│   │   └── src/
│   │       ├── lib/utils.ts              # cn()
│   │       ├── constants/brand.ts        # BRAND — nunca hardcodar nome
│   │       ├── components/
│   │       │   ├── button.tsx
│   │       │   ├── input.tsx
│   │       │   ├── card.tsx
│   │       │   ├── badge.tsx
│   │       │   └── empty-state.tsx
│   │       └── index.ts
│   ├── validators/
│   │   └── src/
│   │       ├── user.ts                   # LoginSchema, CreateUserSchema
│   │       ├── course.ts                 # CreateCourseSchema
│   │       └── index.ts
│   ├── emails/
│   │   └── src/index.ts                  # Skeleton — TODO fase-1
│   └── notifications/
│       └── src/index.ts                  # Contrato sendWhatsApp — TODO fase-2
├── docs/
│   └── architecture/
│       ├── ADR-001.md                    # Decisão: multi-tenancy por coluna
│       └── ADR-002.md                    # Decisão: NextAuth v5 + Argon2
└── .github/
    ├── workflows/ci.yml                  # typecheck → lint → test → build
    ├── pull_request_template.md
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        └── feature_request.md
```

---

## Decisões tomadas

| Decisão | Justificativa | ADR |
|---|---|---|
| Multi-tenancy por coluna (`tenant_id`) | Custo mínimo de infra; 1 migration serve para ambos; expansível sem refatoração | ADR-001 |
| NextAuth v5 + JWT strategy | Stateless; sem tabela de sessão; integração nativa Next.js 15 | ADR-002 |
| Argon2 para hash de senha | OWASP recomenda Argon2 sobre bcrypt para novos sistemas (resistência a GPU) | ADR-002 |
| Turborepo | Cache de build; pipelines paralelas; sem overhead de configuração manual | — |
| `tenant_id` nunca aceito do client | Previne IDOR — sempre derivado do JWT validado server-side | ADR-001 |
| Seletor de tenant no login | UX: usuário cross-tenant vê contextos disponíveis sem tela separada | ADR-002 |

---

## TODOs pendentes para Fase 1

- `// TODO(fase-1)` em `packages/emails/src/index.ts` — templates React Email (matrícula, expiração, certificado, recuperação de senha)
- `// TODO(fase-1)` em `apps/web/src/app/admin/page.tsx` — dashboard completo
- `// TODO(fase-1)` em `apps/web/src/app/aluno/page.tsx` — listagem de matrículas
- `// TODO(fase-1)` em `apps/web/src/app/prof/page.tsx` — listagem de turmas
- Rate limit de login (5 tentativas / 15 min) via Upstash Redis — `// TODO(fase-1)` em `packages/auth/src/config.ts`
- Sentry — configurar `instrumentation.ts` no `apps/web`
- Componentes Table, Dialog, Toast, Select no `packages/ui` — necessários a partir da Fase 1

---

## Como rodar e validar localmente

```bash
# 1. Subir banco e Redis
docker compose -f docker-compose.dev.yml up -d

# 2. Copiar variáveis
cp .env.example .env.local
# Preencher obrigatoriamente:
# DATABASE_URL=postgresql://postgres:dev@localhost:5432/nexora_dev
# NEXTAUTH_SECRET=<openssl rand -base64 32>
# NEXTAUTH_URL=http://localhost:3000
# UPSTASH_REDIS_URL=redis://localhost:6379

# 3. Instalar dependências
npm install

# 4. Gerar client Prisma + migration + seed
cd packages/db
npx prisma migrate dev --name init
npx prisma db seed
cd ../..

# 5. Rodar
npm run dev
```

### Checklist de validação da fase

- [ ] `npm run dev` sobe sem erros de TypeScript
- [ ] Login com `aluno1@nexora.edu / nexora@aluno` → redireciona para `/aluno`
- [ ] Login com `admin.a@nexora.edu / nexora@admin` → redireciona para `/admin`
- [ ] Login com `cross@nexora.edu / nexora@cross` → exibe seletor de tenant (2 opções)
- [ ] Acessar `/admin` sem estar logado → redireciona para `/login`
- [ ] Acessar `/admin` logado como aluno → redireciona para `/unauthorized`
- [ ] Login com senha errada → mensagem genérica, sem revelar se email existe

---

## Melhorias identificadas e implementadas

- `EmptyState` componentizado em `packages/ui` (antecipando uso massivo na Fase 1)
- `BRAND` constante central — todas as referências ao nome da plataforma via env var
- Health checks no docker-compose (`pg_isready`, `redis-cli ping`) — evita falhas de conexão em startup
- `noUnusedLocals`/`noUnusedParameters` desabilitados em `apps/web/tsconfig.json` — Next.js 15 gera tipos que disparariam falsos positivos
