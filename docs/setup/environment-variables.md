# Variáveis de Ambiente

Todas as variáveis ficam em `.env.local` (desenvolvimento) ou nas variáveis de ambiente do Railway (produção). **Nunca commite segredos no repositório.**

## Obrigatórias

### Banco de dados

| Variável | Exemplo | Descrição |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:dev@localhost:5432/nexora_dev` | URL de conexão PostgreSQL |

### Autenticação

| Variável | Exemplo | Descrição |
|---|---|---|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Chave de assinatura JWT — mínimo 32 caracteres |
| `NEXTAUTH_URL` | `http://localhost:3000` | URL base da aplicação |

### Cache e Rate Limit (Upstash Redis)

| Variável | Exemplo Dev | Descrição |
|---|---|---|
| `UPSTASH_REDIS_URL` | `redis://localhost:6379` | URL do Redis |
| `UPSTASH_REDIS_TOKEN` | `qualquer-string` | Token de autenticação (qualquer valor em dev local) |

## Opcionais (com fallback em dev)

### Storage (Cloudflare R2)

| Variável | Descrição |
|---|---|
| `R2_ACCOUNT_ID` | ID da conta Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key do R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Key do R2 |
| `R2_BUCKET_NAME` | Nome do bucket |
| `R2_PUBLIC_URL` | URL pública do bucket (para downloads) |

Em dev sem R2 configurado, uploads usam armazenamento local em `/tmp`.

### E-mail (Resend)

| Variável | Descrição |
|---|---|
| `RESEND_API_KEY` | API Key do Resend |
| `EMAIL_FROM` | Endereço remetente (ex: `noreply@nexora.edu`) |

Sem configuração, e-mails são logados no console em dev.

### Monitoramento (Sentry)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | DSN do projeto Sentry |
| `SENTRY_AUTH_TOKEN` | Token para upload de source maps |
| `SENTRY_ORG` | Organização no Sentry |
| `SENTRY_PROJECT` | Nome do projeto no Sentry |

### WhatsApp (Digisac)

| Variável | Descrição |
|---|---|
| `DIGISAC_API_KEY` | API Key do Digisac |
| `DIGISAC_SERVICE_ID` | ID do serviço Digisac |

### ERP (Omie)

| Variável | Descrição |
|---|---|
| `OMIE_APP_KEY` | App Key Omie |
| `OMIE_APP_SECRET` | App Secret Omie |

### IA (Groq)

| Variável | Descrição |
|---|---|
| `GROQ_API_KEY` | API Key do Groq (IA generativa) |

## Como gerar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Ou no Node.js:

```js
require('crypto').randomBytes(32).toString('base64')
```

## .env.example

O arquivo `.env.example` no root do repositório contém todas as variáveis com valores de exemplo e comentários. Copie-o para `.env.local` e preencha os valores reais.

```bash
cp .env.example .env.local
```

> `.env.local` está no `.gitignore` e nunca deve ser commitado.
