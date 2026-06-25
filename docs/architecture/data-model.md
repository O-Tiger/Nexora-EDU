# Modelo de Dados

Schema completo em [`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma).

## Grupos de models

### Identidade e acesso

```
User                    # Identidade global (email, senha hash, nome)
TenantMembership        # Vínculo User ↔ Tenant ↔ Role
Tenant                  # Instituição (nome, domínio, configurações)
TenantConfig            # Configurações visuais (logo, cores)
```

Um usuário pode ter múltiplos vínculos (ex: professor no Colégio + aluno na Faculdade). O JWT carrega `activeTenantId` e `availableTenants`.

### EAD

```
Course                  # Curso (título, descrição, capa, certificado)
Module                  # Módulo dentro de um curso
Lesson                  # Aula (vídeo / PDF / texto / link / ao vivo)
CourseEnrollment        # Matrícula em curso (com expiração opcional)
LessonProgress          # Progresso por aluno/aula
Assessment              # Avaliação com questões
Submission              # Entrega do aluno
Certificate             # Certificado emitido
CertificateTemplate     # Template configurável por tenant
PageLayout              # Página do Page Builder (com versões)
```

### Secretaria K-12

```
Unidade                 # Unidade física da escola
AnoLetivo               # Ano letivo (status: PLANEJADO / EM_ANDAMENTO / ENCERRADO)
Turma                   # Turma (etapa, período, capacidade, código)
TurmaEnrollment         # Matrícula K-12 (status: ATIVA / TRANSFERIDA / CANCELADA / CONCLUÍDA)
Guardian                # Responsável do aluno (com userId opcional → acesso portal)
```

### Pedagógico

```
Disciplina              # Disciplina (auto-relação parentId = frente)
TurmaDisciplina         # Vínculo Turma ↔ Disciplina (+ professor)
Professor               # Cadastro interno de professor (sem login próprio)
Grade                   # Nota por aluno/disciplina/período/tipo
Attendance              # Faltas manuais por aluno/disciplina
RegistroAula            # Entrada do diário de classe (data, conteúdo, N aulas)
PresencaAluno           # Faltas por aluno em um RegistroAula
HorarioAula             # Slot da grade de horários (dia, ordem, frequência)
EnrollmentFrente        # Trilha de Itinerário Formativo por aluno/disciplina
```

### Financeiro

```
Mensalidade             # Parcela financeira (valor, vencimento, status)
```

### Comunicação

```
Announcement            # Aviso/comunicado por turma
EventoCalendario        # Evento no calendário da turma
```

## Relações principais

### TurmaEnrollment → múltiplos vínculos

```
TurmaEnrollment
  ├─ grades           Grade[]
  ├─ attendances      Attendance[]
  ├─ presencas        PresencaAluno[] (via RegistroAula)
  └─ enrollmentFrentes EnrollmentFrente[]
```

### Disciplina (auto-relação frentes)

```
Disciplina (pai)
  └─ frentes: Disciplina[]  (parentId preenchido)
```

Frentes são sub-disciplinas graduadas separadamente. Ex: "Matemática" → "Matemática 1", "Matemática 2".

Para disciplinas de Itinerário Formativo (`isItinerario = true`), cada aluno escolhe uma frente via `EnrollmentFrente`.

### Professor (cadastro interno vs. login)

```
Professor (cadastro interno)
  └─ linkedUser: User?   (userId → acesso ao portal /prof)
```

O `Professor` é um cadastro operacional (nome, email, telefone). Para acessar o portal `/prof`, o admin vincula um `User` com role `PROFESSOR` via `Professor.userId`.

## Índices e constraints notáveis

- `TurmaEnrollment`: `@@unique([studentId, anoLetivoId])` — aluno em uma turma por ano letivo
- `Grade`: `@@unique([enrollmentId, disciplinaId, period, kind])`
- `HorarioAula`: `@@unique([turmaId, diaSemana, ordem, frequencia])` — permite par + ímpar na mesma célula
- `EnrollmentFrente`: `@@unique([enrollmentId, disciplinaId])` — uma trilha por aluno por disciplina

## Convenções

- `id`: `@default(cuid())` em todos os models
- `tenantId`: presente em todos os models com dados de tenant
- `createdAt` / `updatedAt`: presentes nos models principais
- Soft delete: não usado — dados são excluídos diretamente (com guards na UI)
