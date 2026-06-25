# Primeiros Passos

Este guia é para quem quer rodar o Nexora EDU localmente ou fazer deploy em produção.

---

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Docker Desktop
- Git

---

## Instalação local

```bash
# 1. Clonar o repositório
git clone https://github.com/O-Tiger/Nexora-EDU.git
cd Nexora-EDU

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com seus valores
```

### Variáveis mínimas para desenvolvimento

```env
DATABASE_URL="postgresql://postgres:dev@localhost:5432/nexora_dev"
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"
UPSTASH_REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_TOKEN="qualquer-string"
```

---

## Subir os serviços

```bash
# Iniciar PostgreSQL e Redis via Docker
docker compose -f docker-compose.dev.yml up -d

# Aplicar as migrations do banco
npm run db:migrate

# Popular o banco com dados de teste
npm run db:seed

# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**

---

## Fazer login

Use as credenciais de seed para testar cada portal:

| Portal | E-mail | Senha |
|---|---|---|
| Admin (Inst. A) | `admin.a@nexora.edu` | `nexora@admin` |
| Admin (Inst. B) | `admin.b@nexora.edu` | `nexora@admin` |
| Professor | `prof.a@nexora.edu` | `nexora@prof` |
| Aluno | `aluno1@nexora.edu` | `nexora@aluno` |

> Essas credenciais são apenas para desenvolvimento. Nunca use em produção.

---

## Deploy em produção

O Nexora EDU faz deploy automático no [Railway](https://railway.app) ao fazer push para `main`.

Para configurar do zero:

1. Crie um projeto no Railway
2. Adicione os plugins **PostgreSQL** e **Upstash Redis**
3. Configure as variáveis de ambiente (veja [documentação completa](https://github.com/O-Tiger/Nexora-EDU/blob/main/docs/deploy/railway.md))
4. Conecte o repositório GitHub — o Railway detecta automaticamente o Next.js

---

## Próximos passos

- [Portal Admin](Portal-Admin) — como configurar sua instituição
- [Portal Professor](Portal-Professor) — como lançar notas e registrar aulas
- [Portal Responsável](Portal-Responsavel) — como acompanhar o desempenho do aluno
- [Perguntas Frequentes](FAQ)
