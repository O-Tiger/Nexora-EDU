# Solução de Problemas

## Banco de dados

### `prisma migrate dev` retorna erro "non-interactive environment"

**Causa:** Terminais integrados de IDEs (VS Code, WebStorm) não satisfazem o requisito de TTY interativo do Prisma.

**Solução:** Execute em um terminal externo:
```bash
# Windows: abra o PowerShell fora da IDE
cd C:\caminho\para\Nexora-EDU\packages\db
npx prisma migrate dev
```

---

### Migration falha com "already exists" no PostgreSQL

**Causa:** Um índice ou constraint foi criado fora do fluxo normal de migration.

**Solução:**
```bash
# Marcar a migration como aplicada sem executar o SQL
cd packages/db
npx prisma migrate resolve --applied "nome_da_migration"
```

Se o conflito for real, conecte ao banco e remova o objeto conflitante manualmente antes de re-executar.

---

### Prisma Client desatualizado após migration

**Sintoma:** Erros de TypeScript sobre campos que existem no schema mas não no tipo gerado.

**Solução:**
```bash
cd packages/db
npx prisma generate
```

---

## Autenticação

### Login falha com "CredentialsSignin" mesmo com senha correta

**Causa mais comum:** O hash no banco está de uma execução anterior do seed e não foi atualizado.

**Solução:** Re-execute o seed (ele upserta e re-cria todos os hashes):
```bash
npm run db:seed
```

Se o problema persistir, verifique se `NEXTAUTH_SECRET` está configurado e é uma string com 32+ caracteres.

---

### Redirect infinito em `/admin` ou `/prof`

**Causa:** O middleware não consegue ler o JWT — `NEXTAUTH_SECRET` difere entre sessões ou está vazio.

**Solução:**
1. Verifique `NEXTAUTH_SECRET` em `.env.local`
2. Limpe os cookies do navegador para o domínio local
3. Reinicie o servidor dev

---

## Build e TypeScript

### `npm run typecheck` retorna erros em `@nexora/db`

**Causa:** Prisma Client não gerado ou desatualizado após uma migration.

**Solução:**
```bash
cd packages/db
npx prisma generate
cd ../..
npm run typecheck
```

---

### Build falha com "Module not found: @nexora/ui"

**Causa:** Pacotes do workspace não instalados corretamente.

**Solução:**
```bash
# Na raiz do monorepo
npm install
npm run build
```

---

## Docker

### Containers não sobem / PostgreSQL não fica healthy

**Solução:**
```bash
# Parar e remover volumes
docker compose -f docker-compose.dev.yml down -v

# Recriar
docker compose -f docker-compose.dev.yml up -d

# Verificar status
docker compose -f docker-compose.dev.yml ps
```

---

### Porta 5432 já em uso

**Causa:** Outra instância do PostgreSQL está rodando localmente.

**Solução:** Pare o PostgreSQL local ou mude a porta no `docker-compose.dev.yml`:
```yaml
ports:
  - "5433:5432"  # usa porta 5433 no host
```
E atualize `DATABASE_URL` para `...@localhost:5433/...`.

---

## PDF / Boletim

### PDF do boletim retorna erro 500

**Causa provável:** Puppeteer não encontrou o binário do Chrome.

**Solução:** Defina o caminho explicitamente em `.env.local`:
```env
PUPPETEER_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

No Linux/Railway, o binário é detectado automaticamente pelo Nixpacks.

---

## Railway (Produção)

### Deploy falha com "migrate deploy error"

**Causa:** Migration incompatível com o estado atual do banco de produção.

**Solução:**
```bash
# Via Railway CLI — checar estado das migrations
railway run --service web npx prisma migrate status

# Se necessário, resolver manualmente
railway run --service web npx prisma migrate resolve --applied "nome_da_migration"
```

---

## Ainda com problemas?

Abra uma issue em [github.com/O-Tiger/Nexora-EDU/issues](https://github.com/O-Tiger/Nexora-EDU/issues) com:
- Descrição do problema
- Mensagem de erro completa
- Stack: OS, Node.js version, npm version
- Passos para reproduzir
