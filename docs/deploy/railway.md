# Deploy — Railway

## Visão geral

| Serviço | Plataforma | Trigger |
|---|---|---|
| `apps/web` (Next.js) | Railway | Push para `main` |
| PostgreSQL | Railway (plugin) | — |
| Redis | Railway (plugin Upstash) | — |

O Railway faz build automático com Nixpacks ao detectar o `apps/web`.

## Variáveis de ambiente no Railway

Configure todas as variáveis em **Railway → Project → Variables**. Nunca commite valores reais no repositório.

### Obrigatórias

```
DATABASE_URL              # Fornecido automaticamente pelo plugin PostgreSQL
NEXTAUTH_SECRET           # openssl rand -base64 32
NEXTAUTH_URL              # https://seu-dominio.up.railway.app
UPSTASH_REDIS_URL         # Fornecido pelo plugin Upstash
UPSTASH_REDIS_TOKEN       # Fornecido pelo plugin Upstash
```

### Opcionais (conforme features em uso)

```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
RESEND_API_KEY
EMAIL_FROM
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
DIGISAC_API_KEY
DIGISAC_SERVICE_ID
OMIE_APP_KEY
OMIE_APP_SECRET
GROQ_API_KEY
```

Veja [environment-variables.md](../setup/environment-variables.md) para descrição de cada variável.

## Migrations em produção

As migrations são aplicadas automaticamente no deploy via `prisma migrate deploy` (configurado no script de build/start do Railway). O seed **não** roda em produção.

Se precisar aplicar uma migration manualmente em produção:

```bash
# Via Railway CLI
railway run --service web npx prisma migrate deploy
```

## Domínio customizado

1. Railway → Settings → Networking → Custom Domain
2. Adicione o domínio e configure o DNS conforme as instruções do Railway
3. Atualize `NEXTAUTH_URL` para o domínio customizado

## Logs e monitoramento

```bash
# Ver logs em tempo real
railway logs --service web --tail

# Via Railway dashboard: Project → Deployments → Log
```

Erros de aplicação são capturados pelo Sentry (quando configurado).

## Rollback

Em caso de deploy com problema:

1. Railway → Deployments → clique no deploy anterior → **Redeploy**
2. Se o problema for de schema/migration: aplique um rollback manual via Railway CLI antes de redesobrir

## Checklist pré-deploy

- [ ] `npm run typecheck` — zero erros
- [ ] `npm run build` — build de produção sem erros
- [ ] Todas as variáveis de ambiente configuradas no Railway
- [ ] CHANGELOG.md atualizado
- [ ] Versão bumped no `package.json`
- [ ] Branch `dev` mergeada em `main` via PR com CI verde

Veja o [release workflow completo](release-workflow.md).
