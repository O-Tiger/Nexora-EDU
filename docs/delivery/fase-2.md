# Entrega — Fase 2: Completo

**Data:** 2026-06-11  
**Branch:** `dev`  
**Status:** ✅ Todos os 7 subsistemas concluídos

---

## O que foi construído

### 1. Page Builder
- Blocos Zod (hero, richText, featureGrid, courseList, cta, image, spacer)
- Versionamento de layouts com poda automática (máx. 10 versões) e rollback
- Editor drag-and-drop `/admin/paginas` com preview e histórico
- `PageRenderer`/`BlockView` server-side; rota pública `/p/[pageType]`
- richText sanitizado com isomorphic-dompurify

### 2. Avaliações
- Models `Assessment`/`Question`/`Submission` + migration
- Avaliador de fórmula mathjs seguro (`lib/grade-formula`) com preview
- Upload validado por magic bytes (`lib/file-validation`, `FileUploadZone`)
- Autoria em `/admin/cursos/[id]/avaliacoes`; aluno responde em `/aluno/avaliacoes`
- Correção automática (MC/V-F) + manual (dissertativa); auditoria de submit/grade
- **Pendência conhecida:** campo `recoveryOfId` existe no schema mas UI de recuperação não foi construída

### 3. Comunicação
- Models `Announcement`/`ForumThread`/`ForumReply`/`DirectMessage`/`KnowledgeEntry`
- Avisos segmentados (plataforma/curso); fórum por módulo com respostas aninhadas
- Mensagens diretas aluno ↔ admin; chatbot Groq llama3-8b com RAG + escalonamento Digisac
- `ChatbotWidget` flutuante no layout do aluno; `/admin/comunicacao`

### 4. Aulas ao vivo
- Model `LiveSession`/`LiveAttendance`; validators Zod; server actions completos
- Sala de espera com countdown + embed iframe (Zoom/Meet/Teams)
- Presença automática; cron de lembretes (`/api/cron/live-reminders`)
- Admin: `/admin/cursos/[id]/aulas/[lessonId]/live`

### 5. Digisac + Omie
- `sendWhatsApp` via Digisac API com fallback graceful (credenciais ausentes)
- `WhatsAppTemplate` por evento/tenant configurável em `/admin/comunicacao/whatsapp`
- Omie: `upsertClient` + `createReceivable` em fire-and-forget; `OmieSync` PENDING/SYNCED/FAILED
- Webhooks inbound: `/api/webhooks/digisac` (→ DirectMessage) e `/api/webhooks/omie` (pagamento)
- WhatsApp disparado em: `enrollment.created`, `enrollment.reactivated`, `live.reminder`
- `User.phone` E.164 adicionado ao schema

### 6. LGPD
- Consent gate no layout `/aluno` → redirect `/consentimento` se `consentedAt` null
- `/consentimento`: termos + política de privacidade com aceite persistido
- `/aluno/meus-dados`: dados pessoais, exportação JSON (R2 presigned 24h), exclusão de conta
- API `/api/meus-dados/export`: coleta todos os dados, upload R2, retorna URL 24h
- Anonimização imediata em exclusão: nome/email/cpf/phone substituídos
- Rate limit 1 export/24h; auditlog em todos os eventos LGPD

### 7. WCAG 2.1 AA + PWA + i18n
- **WCAG:** skip-to-content, `aria-label`/`aria-current`/`aria-hidden`, `focus-visible` global, `prefers-reduced-motion`
- **PWA:** `manifest.webmanifest`, meta tags `theme-color`/viewport/apple-web-app, `@ducanh2912/next-pwa` com Workbox
- **i18n:** `next-intl` com mensagens pt/en/es, locale por cookie, `LocaleSwitcher` no sidebar

---

## Decisões técnicas

| Decisão | Motivo |
|---|---|
| Omie sync apenas para `inst_a` | `inst_b` usa Google Classroom — Omie só faz sentido para a Faculdade |
| i18n sem prefixo de URL | `typedRoutes: true` tornaria a migração de todas as rotas um refactor enorme; cookie-based é pragmático |
| Anonimização imediata (sem período de graça) | LGPD art. 18 — direito de exclusão deve ser honrado; período de graça seria complexidade desnecessária agora |
| WhatsApp fire-and-forget | Falhas de integração externa nunca devem abortar a operação principal (matrícula) |
| `UserDataExport` model separado | Permite rate limit, auditoria e consulta futura de exports pendentes/expirados |

---

## Pendências conhecidas (para Fase 3+)

- `TODO(fase-2)` em `recoveryOfId`: UI de avaliação de recuperação não construída
- `TODO(fase-1)` em `resolveVideoId`: lookup real de videoRef → YouTube ID
- `/p/[pageType]` (Page Builder): resolução de tenant por domínio para páginas públicas
- Fase 3 financeiro: `syncEnrollmentToOmie` usa `amount: 0` — pricing real virá com módulo financeiro
- Icons PWA (`/public/icons/icon-192.png`, `icon-512.png`) precisam ser criados (ativos visuais)
- i18n: strings existentes permanecem hardcoded em pt-BR; novos componentes devem usar `useTranslations()`

---

## Como validar localmente

```bash
# 1. Aplicar migration (com DATABASE_URL configurada)
npx prisma migrate dev --schema packages/db/prisma/schema.prisma

# 2. Instalar dependências
npm install

# 3. Rodar app
cd apps/web && npm run dev

# 4. Fluxo de validação da fase (Master Prompt)
# - Criar matrícula de aluno → verificar WhatsApp enviado (ou log de fallback no console)
# - Aluno faz avaliação com fórmula customizada → verificar nota calculada
# - Admin publica layout via page builder → verificar /p/home
# - AuditLog registra todas as ações acima
# - LGPD: acessar /aluno sem consentimento → redirect /consentimento
# - Exportar dados pessoais → verificar JSON gerado
```

---

## Próximo: Fase 3 — Gestão Escolar (inst_b)

Pré-requisito cumprido: Fase 2 completa e documentada.
