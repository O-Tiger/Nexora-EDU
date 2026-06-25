# Banco de Dados

## Tecnologia

- **PostgreSQL 16** — banco relacional
- **Prisma ORM** — schema, migrations, client TypeScript
- Schema em: `packages/db/prisma/schema.prisma`
- Migrations em: `packages/db/prisma/migrations/`

## Comandos

### Desenvolvimento

```bash
# Aplicar migrations pendentes (interativo — use terminal externo, não IDE integrado)
npm run db:migrate
# ou dentro de packages/db:
cd packages/db && npx prisma migrate dev

# Criar nova migration após mudança no schema
cd packages/db && npx prisma migrate dev --name "descricao-da-mudanca"

# Regenerar Prisma Client (necessário após qualquer mudança no schema)
cd packages/db && npx prisma generate

# Abrir Prisma Studio (GUI para inspecionar dados)
npm run db:studio

# Popular banco com dados de seed
npm run db:seed
```

### Reset completo (apaga tudo)

```bash
cd packages/db
npx prisma migrate reset
```

Isso executa, em ordem: drop do banco, recriação, aplicação de todas as migrations, execução do seed.

### Produção / Deploy

```bash
# Apenas aplica migrations pendentes — sem interatividade, sem seed
npx prisma migrate deploy
```

Usado pelo Railway no deploy automático.

## Seed

O arquivo `packages/db/src/seed.ts` popula o banco com:

- 2 tenants de teste (`inst_a` — Faculdade, `inst_b` — Colégio)
- 9 usuários de seed com diferentes roles
- Configurações de tenant, disciplinas e estrutura pedagógica básica

O seed usa `upsert` — é seguro re-executar sem duplicar dados. As senhas são sempre recriadas ao executar o seed.

## Estrutura do schema

Veja o [modelo de dados](../architecture/data-model.md) para a documentação completa dos models e relações.

Convenções:
- `id`: `@default(cuid())` em todos os models
- `tenantId`: presente em todos os models com dados de tenant
- Sem soft delete — registros são excluídos fisicamente

## Migrations

Cada migration fica em `packages/db/prisma/migrations/YYYYMMDDHHMMSS_nome/migration.sql`.

Regras:
- Nunca edite um arquivo de migration que já foi aplicado em produção
- Para reverter uma migration problemática: `prisma migrate resolve --rolled-back <id>`
- Em caso de conflito de índice no PostgreSQL: evite `DROP INDEX CONCURRENTLY` dentro de transactions — use `DROP INDEX "nome"` diretamente

## Multi-tenancy

Todos os models que contêm dados de tenant têm `tenantId String`. As queries sempre filtram por `tenantId` extraído do JWT. Nunca aceite `tenantId` de input do usuário.

Veja [ADR-001](../architecture/ADR-001.md) para a decisão de arquitetura de multi-tenancy.
