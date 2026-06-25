# Setup — Desenvolvimento Local

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20 |
| npm | 10 |
| Docker Desktop | qualquer versão recente |
| Git | qualquer |

## 1. Clonar e instalar

```bash
git clone https://github.com/O-Tiger/Nexora-EDU.git
cd Nexora-EDU
npm install
```

## 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com os valores de desenvolvimento. Veja [environment-variables.md](environment-variables.md) para a lista completa.

Os valores mínimos para rodar localmente:

```env
DATABASE_URL="postgresql://postgres:dev@localhost:5432/nexora_dev"
NEXTAUTH_SECRET="qualquer-string-aleatoria-longa"
NEXTAUTH_URL="http://localhost:3000"
UPSTASH_REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_TOKEN="dev-token"
```

## 3. Subir serviços com Docker

```bash
docker compose -f docker-compose.dev.yml up -d
```

Isso sobe:
- PostgreSQL 16 na porta `5432` (usuário: `postgres`, senha: `dev`, banco: `nexora_dev`)
- Redis na porta `6379`

Verificar se estão rodando:

```bash
docker compose -f docker-compose.dev.yml ps
```

## 4. Configurar o banco

```bash
# Aplicar migrations
npm run db:migrate

# Gerar Prisma Client (necessário após migrations ou mudanças no schema)
cd packages/db && npx prisma generate && cd ../..

# Popular com dados de seed
npm run db:seed
```

## 5. Rodar o servidor de desenvolvimento

```bash
npm run dev          # Turbopack (padrão, mais rápido)
npm run dev:webpack  # Webpack (fallback se houver problemas com Turbopack)
```

Acesse `http://localhost:3000`.

## Credenciais de seed

| E-mail | Senha | Role | Tenant |
|---|---|---|---|
| `superadmin@nexora.edu` | `nexora@superadmin` | OWNER | inst_a + inst_b |
| `admin.a@nexora.edu` | `nexora@admin` | ADMINISTRATOR | inst_a |
| `admin.b@nexora.edu` | `nexora@admin` | ADMINISTRATOR | inst_b |
| `prof.a@nexora.edu` | `nexora@prof` | PROFESSOR | inst_a |
| `prof.b@nexora.edu` | `nexora@prof` | PROFESSOR | inst_b |
| `aluno1@nexora.edu` | `nexora@aluno` | STUDENT | inst_a |
| `aluno2@nexora.edu` | `nexora@aluno` | STUDENT | inst_a |
| `aluno3@nexora.edu` | `nexora@aluno` | STUDENT | inst_a |
| `cross@nexora.edu` | `nexora@cross` | PROFESSOR (inst_b) + STUDENT (inst_a) | ambos |

> **Aviso:** Nunca use essas credenciais ou senhas em produção.

## Comandos úteis do dia a dia

```bash
npm run typecheck        # TypeScript em todos os pacotes (deve retornar zero erros)
npm run lint             # ESLint
npm run test             # Vitest
npm run db:studio        # Abrir Prisma Studio em http://localhost:5555
npm run db:seed          # Re-popular banco (os upserts sobrescrevem dados existentes)
```

## Resetar o banco

```bash
cd packages/db
npx prisma migrate reset   # ATENÇÃO: apaga todos os dados e re-aplica migrations + seed
```

## Solução de problemas comuns

### "Can't reach database server at localhost:5432"

O Docker não está rodando ou o container PostgreSQL não subiu.

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

### "Prisma Migrate has detected that the environment is non-interactive"

Ocorre ao rodar `prisma migrate dev` em terminais integrados de IDEs.
Use um terminal externo (PowerShell, CMD, Terminal do sistema).

### Prisma Client desatualizado após migration

```bash
cd packages/db && npx prisma generate
```

### Porta 3000 em uso

```bash
# Matar processo na porta 3000
npx kill-port 3000
```

### Hashes de senha inválidos (seed antigo)

Se o login falhar mesmo com as credenciais corretas, os hashes do seed podem estar desatualizados. Re-execute:

```bash
npm run db:seed
```
