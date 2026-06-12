# Changelog

Todas as mudanças relevantes do projeto Nexora EDU são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Added (Fase 2 — WCAG / PWA / i18n)
- **WCAG 2.1 AA**: skip-to-content link em todas as páginas (SC 2.4.1); `id="main-content"` + `tabIndex={-1}` em `<main>`; `aria-label` em `<aside>` e `<nav>`; `aria-current="page"` nos links de navegação ativos; `aria-hidden="true"` em ícones decorativos; `focus-visible` global com anel teal; `prefers-reduced-motion` desativa animações; `focus-ring` utility aplicado aos links de navegação
- **PWA**: `public/manifest.webmanifest` (name, icons 192/512, start_url, display standalone, shortcuts); meta tags `theme-color`, `viewport`, `apple-mobile-web-app-capable` no root layout via `Viewport` export; `@ducanh2912/next-pwa` integrado ao `next.config.ts` (desabilitado em dev, Workbox em produção)
- **i18n**: `next-intl` instalado; mensagens pt/en/es em `apps/web/messages/`; locale detectado por cookie `NEXT_LOCALE`; `NextIntlClientProvider` no root layout; `LocaleSwitcher` no `StudentSidebar` (PT / EN / ES); sem prefixo de URL para preservar `typedRoutes`

### Added (Fase 2 — LGPD)
- `packages/db`: campos `User.consentedAt` e `User.anonymizedAt`; model `UserDataExport` (PENDING/READY/EXPIRED) + migration manual
- `apps/web`: gate de consentimento no layout `/aluno` — redireciona para `/consentimento` se `consentedAt` for null
- `apps/web`: página `/consentimento` com termos e política de privacidade, botão de aceite que persiste `consentedAt`
- `apps/web`: `/aluno/meus-dados` — exibe dados pessoais, exporta JSON via R2 (presigned URL 24h), exclusão de conta com anonimização imediata
- `apps/web`: API `/api/meus-dados/export` — coleta dados (perfil, matrículas, submissões, fórum, mensagens, auditlog), faz upload ao R2, retorna presigned URL 24h
- `apps/web`: server actions `acceptConsentAction`, `requestDataExportAction`, `requestAccountDeletionAction` com rate limit (1 export/24h) e auditlog em todos os eventos LGPD
- `apps/web`: link "Meus Dados" adicionado ao `StudentSidebar`
- `apps/web/src/lib/r2.ts`: `getPresignedDownloadUrl` aceita `expiresIn` customizado

### Added (Fase 2 — Digisac + Omie)
- `packages/db`: campo `User.phone` (E.164 sem '+'); models `WhatsAppTemplate` (templates por evento/tenant, com placeholders `{{name}}` etc.) e `OmieSync` (estado de sincronia matrícula↔Omie) + migration manual
- `packages/notifications`: implementação real do cliente Digisac — `sendWhatsApp()` faz POST para a API com fallback silencioso quando `DIGISAC_TOKEN`/`DIGISAC_SUBDOMAIN` não estão presentes
- `apps/web/src/lib/whatsapp.ts`: helper `sendWhatsAppEvent()` que resolve template do banco, renderiza `{{placeholders}}` e despacha via Digisac
- `apps/web/src/lib/omie.ts`: cliente JSON-RPC Omie — `upsertOmieClient()`, `createOmieReceivable()`, `syncEnrollmentToOmie()` (fire-and-forget com persistência em OmieSync; skipa `inst_b`)
- `apps/web`: `enrollUserAction` dispara WhatsApp `enrollment.created` + sync Omie em fire-and-forget após matrícula
- `apps/web`: `reactivateEnrollmentAction` dispara WhatsApp `enrollment.reactivated`
- `apps/web`: cron `live-reminders` envia WhatsApp `live.reminder` com `{{name}}`, `{{lesson}}`, `{{date}}`, `{{time}}`
- `apps/web`: webhook `/api/webhooks/digisac` — valida bearer token, rota mensagem inbound para `DirectMessage` pelo telefone do usuário
- `apps/web`: webhook `/api/webhooks/omie` — valida `X-Omie-Token`, processa `ContaReceberPaga`/`ContaReceberCancelada`, registra em AuditLog
- `apps/web`: admin gerencia templates em `/admin/comunicacao/whatsapp` — CRUD por evento com preview de placeholders e toggle ativo/inativo
- `.env.example`: adicionados `DIGISAC_WEBHOOK_SECRET` e `OMIE_WEBHOOK_SECRET`

### Added (Fase 2 — Aulas ao vivo)
- `packages/db`: models `LiveSession` (agendamento, URL, status, gravação) e `LiveAttendance` (presença automática) + migration; queries CRUD, registro de presença e conclusão automática de aula ao vivo
- `packages/validators`: schema Zod de criação/atualização de sessão com validação de URL e data futura
- `apps/web`: sala de espera com countdown server-side + embed iframe (Zoom/Meet/Teams) no `CoursePlayer`
- `apps/web`: admin agenda, inicia, encerra e vincula gravação YouTube em `/admin/cursos/[id]/aulas/[lessonId]/live`; ícone de atalho nas aulas LIVE no editor de módulos
- `apps/web`: presença automática registrada ao aluno entrar na sala; aula marcada como concluída
- `apps/web`: cron `/api/cron/live-reminders` que registra lembretes em AuditLog 15 min antes (pronto para plugar Digisac)

### Added (Fase 2 — Comunicação)
- `packages/db`: models `Announcement`, `ForumThread`, `ForumReply`, `DirectMessage`, `KnowledgeEntry` + migration; queries de avisos, fórum, mensagens e base de conhecimento
- `packages/validators`: schemas Zod de avisos, fórum, mensagens diretas e chatbot
- `apps/web`: avisos segmentados (plataforma/curso) com pin, admin publica/exclui em `/admin/comunicacao`
- `apps/web`: fórum por módulo — tópicos, respostas aninhadas (1 nível), bloqueio e pin pelo staff
- `apps/web`: mensagens diretas aluno ↔ admin com leitura automática e badge de não-lidas
- `apps/web`: chatbot Groq llama3-8b com RAG (base de conhecimento editável por tenant), escalonamento para Digisac registrado em AuditLog
- `apps/web`: `ChatbotWidget` flutuante no layout do aluno; base de conhecimento editável em `/admin/comunicacao`

### Added (Fase 2 — Avaliações)
- `packages/db`: models `Assessment`, `Question`, `Submission` (+ enums) e `Course.gradeFormula`; queries de avaliações e submissões com auto-correção
- `packages/validators`: schemas Zod de avaliação, questão (MC/V-F/dissertativa) e respostas
- `apps/web`: avaliador de fórmula de nota com `mathjs` seguro (sanitização + allowlist, nunca `eval`) e preview
- `apps/web`: upload de entregas validado por MIME + magic bytes + limite por tipo (`FileUploadZone` reutilizável)
- `apps/web`: autoria de avaliações (`/admin/cursos/[id]/avaliacoes`), questões, fórmula de nota e correção de dissertativas
- `apps/web`: aluno responde avaliações (`/aluno/avaliacoes`) com auto-correção de objetivas e auditoria de submissão/correção

### Added (Fase 2 — Page Builder)
- `packages/validators`: schemas Zod de blocos do Page Builder (hero, richText, featureGrid, courseList, cta, image, spacer) com hrefs/cores seguros + `PageBlocks`/`PageType`
- `packages/db`: queries de layout (`saveDraft`, `publishBlocks` com versionamento e poda de 10, `rollbackToVersion`) + helper de auditoria (`createAuditLog`, `getAuditLogs`)
- `apps/web`: editor visual de páginas em `/admin/paginas` — paleta de blocos, drag-and-drop @dnd-kit, formulários por bloco, pré-visualização, salvar rascunho, publicar e restaurar versões
- `apps/web`: `PageRenderer`/`BlockView` server-side que interpretam o JSON de blocos (courseList busca cursos publicados)
- `apps/web`: rota pública `/p/[pageType]` que renderiza a versão publicada
- `apps/web`: sanitização de HTML do richText com `isomorphic-dompurify` (defesa contra XSS armazenado)
- `apps/web`: auditoria registrada em cada publicação e rollback de layout (`layout.publish`, `layout.rollback`)

### Added (Fase 1 — MVP EAD — correções)
- `apps/web`: fallback de storage local em dev quando o R2 não está configurado (`storeFile`, `resolveFileUrl`, rota `/api/files/local`) preservando extensão/MIME real; player embute PDF/imagem inline e oferece download para docx/pptx

### Added (Fase 1 — MVP EAD)
- `packages/ui`: Label, Textarea, Skeleton, Separator, Select, Dialog, Table, Toast/Toaster, useToast hook
- `packages/auth`: rate limit de login 5 tentativas/15 min via Upstash Redis
- `packages/emails`: templates React Email (matrícula, expiração, certificado) + `sendEmail()` via Resend
- `packages/db`: queries para cursos, módulos, aulas, matrículas, progresso; model `Certificate`
- `apps/web`: painel admin com dashboard, cursos (CRUD + drag-and-drop @dnd-kit), alunos, matrículas, importação .imscc
- `apps/web`: painel aluno com player de aulas (vídeo/PDF/texto/link/ao vivo), progresso com cache Redis
- `apps/web`: certificados gerados com Puppeteer, armazenados no R2, página pública de validação
- `apps/web`: Cloudflare R2 com presigned URLs (download 15 min, upload 5 min), videoId server-side
- `apps/web`: Sentry instrumentado com sanitização de dados sensíveis
- `apps/web`: cron endpoint para expiração de matrículas (`POST /api/cron/enrollments`)
- `apps/web`: importador .imscc com validação de magic bytes, upload de PDFs para R2

### Added
- Monorepo Turborepo com npm workspaces (`apps/web`, `packages/*`)
- `packages/db`: schema Prisma completo (User, TenantMembership, Course, Module, Lesson, Enrollment, LessonProgress, PageLayout, AuditLog, UserOnboarding) + seed de desenvolvimento com 2 tenants, 9 usuários e 1 usuário cross-tenant
- `packages/auth`: NextAuth.js v5 com Argon2, JWT multi-tenant, seletor de tenant, middleware de proteção por role
- `packages/ui`: componentes base (Button, Input, Card, Badge, EmptyState), tokens de design Nexora EDU (navy `#1A3A5C`, teal `#0D9488`), constante `BRAND`
- `packages/validators`: schemas Zod para User e Course
- `packages/emails`: skeleton com TODO para Fase 1
- `packages/notifications`: contrato `sendWhatsApp` com TODO para Fase 2
- `apps/web`: Next.js 15 App Router com layout raiz, páginas de erro/404/unauthorized, login com seletor de tenant, stubs de dashboard por role
- `docker-compose.dev.yml`: PostgreSQL 16 + Redis 7
- `.env.example`: todas as variáveis documentadas
- `docs/architecture/ADR-001.md`: decisão de multi-tenancy por coluna
- `docs/architecture/ADR-002.md`: decisão de autenticação com NextAuth v5 + Argon2
- `.github/workflows/ci.yml`: typecheck + lint + test + build em cada PR/push
- `.github/pull_request_template.md` e templates de Issue (bug, feature)
