# Relatório de Entrega — Fase 1: MVP EAD

**Data:** 2026-06-03  
**Responsável:** Paulo (O-Tiger)  
**Status:** Concluído — pronto para validação

---

## O que foi construído

### packages/ui — Novos componentes
- `Label`, `Textarea`, `Skeleton`, `Separator`
- `Select` (Radix UI), `Dialog` (mobile bottom-sheet / desktop modal)
- `Table` (com scroll horizontal automático em mobile)
- `Toast`, `Toaster`, `useToast` hook
- `Toaster` adicionado ao root layout de `apps/web`

### packages/auth — Melhorias de segurança
- Rate limit de login: 5 tentativas / 15 min por IP via `@upstash/ratelimit`
- Fallback stub para dev sem Redis configurado

### packages/emails — Templates React Email
- Layout base (`BaseLayout`) compartilhado por todos os templates
- `EnrollmentCreatedEmail` — confirmação de matrícula
- `EnrollmentExpiringEmail` — aviso 7 dias antes do vencimento
- `CertificateIssuedEmail` — certificado emitido
- `sendEmail()` centralizado via Resend

### packages/db — Novas queries e model
- `packages/db/src/queries/courses.ts` — CRUD completo de cursos, reordenação de módulos/aulas
- `packages/db/src/queries/modules.ts` — CRUD de módulos e aulas
- `packages/db/src/queries/enrollments-admin.ts` — matrículas admin, expiração, reativação
- `packages/db/src/queries/progress.ts` — progresso por matrícula, marcação de aulas
- Model `Certificate` adicionado ao schema Prisma

### apps/web — Novas páginas e features

#### Infraestrutura
- `src/instrumentation.ts` — Sentry com `beforeSend` que sanitiza dados sensíveis
- `src/lib/r2.ts` — Cloudflare R2: presigned download (15 min) e upload (5 min), `buildFileKey`
- `src/lib/redis.ts` — Cache de progresso no Upstash Redis (TTL 24h)
- `src/lib/certificate.ts` — geração de PDF com Puppeteer + upload R2 + `getOrCreateCertificate`
- `src/lib/imscc-parser.ts` — parser de IMS Common Cartridge (.imscc)

#### Admin
- `/admin` — Dashboard com stats (cursos, alunos, matrículas)
- `/admin/cursos` — Listagem com status e contadores
- `/admin/cursos/novo` — Formulário de criação com auto-slug
- `/admin/cursos/[id]` — Edição + gerenciamento de módulos/aulas com drag-and-drop (@dnd-kit)
- `/admin/alunos` — Listagem com matrículas ativas
- `/admin/matriculas` — Listagem + diálogo de matrícula com seletor de aluno/curso/expiração
- `/admin/importar` — UI de upload drag-and-drop para .imscc
- `AdminSidebar` — Sidebar responsiva (drawer em mobile, fixa em desktop)

#### API Routes
- `POST /api/import/imscc` — processa .imscc, cria curso/módulos/aulas, faz upload de PDFs para R2
- `POST /api/upload/presign` — gera presigned URL para upload direto ao R2
- `GET /api/aulas/[id]/pdf` — resolve presigned URL de PDF (verifica matrícula)
- `GET /api/certificados/[enrollmentId]` — gera/recupera PDF do certificado
- `POST /api/cron/enrollments` — expira matrículas vencidas, detecta expiração em 7 dias

#### Painel do aluno
- `/aluno` — Dashboard com cards de cursos e barra de progresso
- `/aluno/cursos/[slug]` — Player de aulas: vídeo YouTube server-side, PDF via presigned URL, texto, link, ao vivo
- `CoursePlayer` — sidebar de módulos, marcação de aulas completas, auto-avanço
- `StudentSidebar` — sidebar responsiva

#### Validação pública
- `/certificado/[code]` — página pública de validação, sem autenticação necessária

#### Server Actions
- `src/actions/courses.ts` — createCourse, updateCourse, publishCourse, archiveCourse, deleteCourse, createModule, updateModule, deleteModule, reorderModules, createLesson, updateLesson, deleteLesson, reorderLessons
- `src/actions/enrollments.ts` — enrollUser, reactivateEnrollment (com validação de janela de 7 dias)
- `src/actions/progress.ts` — markLessonComplete, markLessonIncomplete (com cache Redis)

---

## Decisões tomadas

| Decisão | Justificativa |
|---|---|
| Presigned URLs com 15 min de expiração | PDFs nunca expostos diretamente — segurança por design |
| videoId YouTube resolvido server-side | `videoRef` no banco nunca exposto ao client — previne scraping |
| Progresso cacheado no Redis | Evita query ao banco em cada load do painel do aluno |
| Puppeteer + Cloudflare R2 para certificados | PDF gerado server-side, armazenado permanentemente, URL com expiração |
| Cron via POST `/api/cron/enrollments` | Railway suporta cron jobs HTTP; `CRON_SECRET` previne chamadas não autorizadas |
| Janela de reativação de 7 dias | Regra de negócio do documento — aluno pode reativar até 7 dias após vencimento |
| Magic bytes check no .imscc | Não confiar apenas na extensão do arquivo — previne upload de executável renomeado |

---

## TODOs pendentes

- `// TODO(fase-2)` em `src/app/api/cron/enrollments/route.ts` — enviar emails e WhatsApp de aviso de expiração
- `// TODO(fase-1)` em `src/lib/r2.ts` — `resolveVideoId()` precisa de lookup real de videoRef → YouTube ID
- Painel admin de alunos: exibir nome do aluno nas matrículas (atualmente mostra `userId` — precisa de join)
- Sentry: adicionar `SENTRY_AUTH_TOKEN` no CI para upload de source maps
- Rate limit: testar com Redis real (Upstash configurado)
- Migração do banco: `npx prisma migrate dev --name add-certificate` necessário para o model Certificate

---

## Como validar localmente

```bash
# 1. Rodar nova migration (model Certificate)
cd packages/db
npx prisma migrate dev --name add-certificate
cd ../..

# 2. Instalar novas dependências
npm install

# 3. Iniciar
npm run dev

# 4. Checklist de validação
```

### Checklist

**Admin:**
- [ ] Login como `admin.a@nexora.edu` → redireciona para `/admin` com stats
- [ ] Criar curso em `/admin/cursos/novo` → aparece na listagem
- [ ] Abrir curso → adicionar módulo → adicionar aula → arrastar para reordenar
- [ ] Publicar curso → status muda para "Publicado"
- [ ] Matricular aluno em `/admin/matriculas` com data de expiração
- [ ] Upload de .imscc em `/admin/importar` → curso criado automaticamente

**Aluno:**
- [ ] Login como `aluno1@nexora.edu` → vê cursos com barra de progresso
- [ ] Acessar um curso → player abre na primeira aula não concluída
- [ ] Marcar aula como concluída → avança automaticamente
- [ ] Progresso reflete corretamente no dashboard

**Segurança:**
- [ ] Acessar `/api/aulas/[id]/pdf` sem login → 401
- [ ] Acessar curso sem matrícula → redirect para `/aluno?sem-acesso=1`
- [ ] `POST /api/cron/enrollments` sem `CRON_SECRET` → 401
- [ ] Upload de arquivo que não é ZIP → rejeitado com mensagem clara
