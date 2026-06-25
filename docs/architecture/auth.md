# Autenticação e Autorização

Decisão documentada em [ADR-002](ADR-002.md).

## Stack

- **NextAuth.js v5** (provider: Credentials)
- **Argon2id** para hash de senha
- **JWT stateless** — sem tabela de sessão no banco
- **Upstash Redis** para rate limit de login

## Fluxo de login

```
POST /api/auth/callback/credentials
  │
  ├─ Rate limit: 5 tentativas / 15 min por IP (Upstash Redis)
  │   └─ Se excedido → retorna null (mensagem genérica)
  │
  ├─ getUserByEmail(email)
  │   └─ Inclui memberships ativas
  │
  ├─ argon2.verify(hash, password)
  │   └─ false → retorna null
  │
  ├─ availableTenants = memberships.map(m => { tenantId, role })
  │   └─ vazio → retorna null
  │
  └─ Retorna: { id, name, email, activeTenantId, role, availableTenants }
      └─ JWT emitido com esses campos
```

**Mensagem de erro:** sempre genérica — `"Email ou senha incorretos."` — independente do motivo real (usuário não encontrado, senha errada, sem tenant ativo).

## JWT payload

```typescript
{
  id: string;             // User.id
  activeTenantId: string; // Tenant ativo na sessão
  role: Role;             // Role no tenant ativo
  availableTenants: { tenantId: string; role: Role }[];
}
```

`activeTenantId` e `role` são os campos mais usados — presentes em todo Server Action e API Route.

## Proteção de rotas — Middleware

```
packages/auth/src/middleware.ts
```

Aplicado globalmente via `apps/web/src/middleware.ts`. Regras por prefixo:

| Prefixo | Roles permitidas |
|---|---|
| `/admin` | ADMINISTRATOR, OWNER |
| `/prof` | PROFESSOR, ADMINISTRATOR, OWNER |
| `/responsavel` | RESPONSIBLE |
| `/aluno` | qualquer autenticado |
| `/api/secretaria/*` | ADMINISTRATOR, OWNER |
| `/api/responsavel/*` | RESPONSIBLE |

Sem JWT válido → redirect `/login`.
Role insuficiente → redirect `/unauthorized`.

## Extração do tenantId em Server Actions

```typescript
// packages/auth/src/config.ts — pattern obrigatório
async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER") redirect("/unauthorized");
  return { tenantId: activeTenantId };
}
```

**Nunca** aceitar `tenantId` do body da requisição. Sempre extrair do JWT.

## Troca de tenant

O usuário pode ter múltiplos vínculos (ex: `cross@nexora.edu` como PROFESSOR em inst_b e STUDENT em inst_a). Para trocar de tenant ativo:

1. Frontend exibe seletor com `session.user.availableTenants`
2. Usuário seleciona → novo `signIn` com `tenantId` explícito
3. JWT reemitido com o novo `activeTenantId` e `role` correspondente

A troca exige reautenticação (novo signIn) — intencional por segurança.

## Rate limit

```typescript
// packages/auth/src/rate-limit.ts
// 5 tentativas por IP por 15 minutos
const rl = await ratelimit.limit(ip);
if (!rl.success) return null; // silencioso — mesma resposta que senha errada
```

Upstash Redis com sliding window. Em dev local com Redis local, o token pode ser qualquer string.

## Segurança de cookies

NextAuth v5 armazena o JWT em cookie `httpOnly` com:
- `sameSite: lax`
- `secure: true` em produção
- Expiração: 8 horas (`jwt.maxAge = 8 * 60 * 60`)

## Portal do Professor — vinculação

Professores são cadastros internos (`Professor` model) sem login próprio. Para acessar `/prof`:

1. Admin cria o cadastro do professor em `/admin/secretaria/professores`
2. Admin vincula o cadastro a um `User` com role `PROFESSOR` via `Professor.userId`
3. No login, `getProfessorByUserId(userId, tenantId)` verifica o vínculo
4. Sem vínculo → redirect `/unauthorized`
