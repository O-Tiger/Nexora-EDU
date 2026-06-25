# Guia de Contribuição

Obrigado pelo interesse em contribuir com o Nexora EDU!

---

## Antes de começar

- Leia o [README](README.md) e a [arquitetura](docs/architecture/overview.md)
- Verifique se já existe uma issue ou PR aberto para o que você quer fazer
- Para mudanças grandes, abra uma issue primeiro para discutir a abordagem

---

## Pré-requisitos

- Node.js ≥ 20
- npm ≥ 10
- Docker (PostgreSQL + Redis em dev)
- Git configurado com seu e-mail

Setup completo: [docs/setup/local-development.md](docs/setup/local-development.md)

---

## Fluxo de trabalho

### 1. Fork e clone

```bash
git clone https://github.com/SEU-USUARIO/Nexora-EDU.git
cd Nexora-EDU
npm install
```

### 2. Crie uma branch a partir de `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b feat/minha-feature
```

Nomenclatura de branches:

| Prefixo | Uso |
|---|---|
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `refactor/` | Refatoração sem mudança de comportamento |
| `chore/` | Config, deps, tooling |
| `docs/` | Apenas documentação |
| `hotfix/` | Correção urgente (branch de `main`) |

### 3. Desenvolva

- Mantenha commits pequenos e focados
- Siga o padrão [Conventional Commits](#commits)
- `npm run typecheck` e `npm run lint` devem passar antes de cada commit

### 4. Abra o Pull Request

- PR sempre para `dev` — **nunca direto para `main`**
- Preencha o template do PR (problema, solução, como testar)
- CI deve estar verde

---

## Commits

Siga [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): descrição curta
fix(scope): descrição curta
refactor(scope): descrição curta
chore(scope): descrição curta
docs: descrição curta
test(scope): descrição curta
```

Use o módulo/área como scope: `feat(auth)`, `fix(boletim)`, `chore(db)`.

**Não usar** `Co-Authored-By` gerado por ferramentas — remova antes de commitar.

---

## Padrões de código

### TypeScript

- Sem `any` implícito — use tipos explícitos ou `unknown`
- Sem `// @ts-ignore` — resolva o erro real
- `exactOptionalPropertyTypes` está ativo — respeite a diferença entre `undefined` e ausência de propriedade

### React / Next.js

- Server Components por padrão — `"use client"` só quando necessário (estado, eventos)
- Server Actions para mutações — nunca exponha endpoints sem autenticação
- `tenantId` sempre do JWT server-side — nunca do body/params da requisição

### Banco de dados

- Todo novo model Prisma **deve ter `tenantId String`**
- Queries com dados de tenant **devem filtrar por `tenantId`**
- Migrations devem ser idempotentes — use `IF NOT EXISTS` quando aplicável

### Segurança

- Leia [SECURITY.md](SECURITY.md) antes de contribuir com auth, uploads ou queries
- Nunca commite segredos, API keys ou tokens — use `.env.local` (gitignored)
- Valide inputs no servidor — nunca confie no cliente

### Tratamento de erros

- Nunca use `catch (e) {}` silencioso — ao mínimo, faça log do erro
- Nunca exponha stack traces ou mensagens de erro internas em respostas de API

---

## Testes

Antes de abrir um PR, execute:

```bash
npm run typecheck   # zero erros de TypeScript
npm run lint        # zero warnings críticos
npm run test        # todos os testes passando
npm run build       # build de produção sem erros
```

Para mudanças na UI, teste manualmente nos breakpoints: 375px / 768px / 1280px.

---

## Documentação

- Para novas features, adicione/atualize o arquivo correspondente em `docs/features/`
- Para decisões arquiteturais significativas, crie um novo `ADR-NNN.md` em `docs/architecture/`
- Atualize o `CHANGELOG.md` com uma entrada em `[Unreleased]`

---

## Dúvidas

Abra uma [issue](https://github.com/O-Tiger/Nexora-EDU/issues) com a label `question`.
