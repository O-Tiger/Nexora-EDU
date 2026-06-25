# Política de Segurança

## Versões suportadas

| Versão | Suporte de segurança |
|---|---|
| `main` (latest) | Sim |
| Versões anteriores | Não |

Apenas a versão mais recente em `main` recebe correções de segurança.

---

## Reportando uma vulnerabilidade

**Não abra uma issue pública para vulnerabilidades de segurança.**

### Como reportar

Envie um e-mail para **workspace.tiger@gmail.com** com:

- **Assunto:** `[SECURITY] Nexora EDU — <descrição curta>`
- Descrição detalhada da vulnerabilidade
- Passos para reproduzir
- Impacto potencial (ex: vazamento de dados cross-tenant, bypass de autenticação)
- Se possível, um PoC (proof of concept) — sem explorar sistemas reais

### O que esperar

| Prazo | Ação |
|---|---|
| Até 48h | Confirmação de recebimento |
| Até 7 dias | Avaliação da severidade e plano de correção |
| Até 30 dias | Correção publicada (dependendo da complexidade) |

Após a correção, o reporter será creditado no CHANGELOG (salvo preferência por anonimato).

---

## Escopo

### Em escopo

- Bypass de autenticação ou autorização
- Acesso cross-tenant (isolamento de dados entre instituições)
- IDOR (acesso a recursos de outros usuários/tenants)
- Injeção SQL ou command injection
- XSS armazenado ou refletido
- Exposição de dados pessoais (LGPD)
- Vulnerabilidades no fluxo de upload de arquivos
- Race conditions em operações financeiras ou de estado

### Fora de escopo

- Ataques de força bruta (já cobertos pelo rate limit de 5 tentativas/15 min)
- Vulnerabilidades em dependências de terceiros não diretamente exploráveis
- Engenharia social
- Ataques que requerem acesso físico ao servidor

---

## Práticas de segurança implementadas

- Argon2id para hash de senhas
- JWT com expiração de 8h, armazenado em cookie `httpOnly`
- Rate limit por IP no login (Upstash Redis)
- `tenantId` sempre derivado do JWT server-side — nunca aceito do client
- Validação de tipo MIME + magic bytes em uploads de arquivo
- Queries parametrizadas via Prisma ORM — sem SQL concatenado
- CORS restrito a origens conhecidas em produção
- Cabeçalhos de segurança via Next.js config
- Sem exposição de stack traces em respostas de produção
