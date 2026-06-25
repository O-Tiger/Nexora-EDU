# Entrega — Fase 3: Gestão Escolar + Qualidade de Plataforma

**Data:** 2026-06-22  
**Branch:** `dev`  
**Status:** ✅ Concluída

---

## O que foi construído

### 1. Secretaria Escolar (inst_b — K-12)

- Modelo completo: `AnoLetivo`, `Unidade`, `Turma`, `TurmaAluno`, `TurmaProfessor`, `AulaEvento`, `PresencaAula`, `NotaFrente`
- CRUD de unidades, anos letivos, turmas com guards de exclusão (não permite deletar turma com alunos)
- Listagem de alunos da escola separada do EAD
- Visão geral da secretaria com métricas e calendário de eventos por turma
- Reservas de vaga com status (PENDENTE / CONFIRMADA / CANCELADA)
- Financeiro escolar: listagem de mensalidades por turma

### 2. Disciplinas e Frentes

- Disciplinas com cor base → variantes automáticas de tom (dark, mid, light, bg, border)
- Frentes (subdivisões pedagógicas de uma disciplina) vinculadas a cada turma
- Notas por frente por aluno com fórmula customizável (mathjs seguro, herdado da Fase 2)
- Grade de notas visual no `/admin/secretaria/turmas/[id]/notas`

### 3. Boletim

- Modo frentes avulsas e modo média ponderada
- Preview inline antes de gerar PDF
- Grid de notas colorido por aprovação/reprovação
- Gerador de boletim por turma

### 4. Grade de Horários

- Grade visual semanal com células coloridas por disciplina
- Professor exibido por célula
- Exportação em PDF
- Calendário de eventos da turma integrado

### 5. Diário de Classe

- Registro de aulas com conteúdo ministrado
- Frequência por aula (presença / falta / justificada)
- Suporte a aulas geminadas (presença parcial)
- Histórico de aulas por turma

### 6. Professores

- Cadastro interno de professores (sem fluxo de login separado — vinculados a usuários)
- Ano letivo por professor para histórico de vínculos

### 7. Onboarding Tour (driver.js)

- Tour guiado de 26 passos para admins, cobrindo os 3 workspaces (EAD, Secretaria, Administração)
- Auto-switch de workspace durante o tour via `CustomEvent`
- Tours específicos para aluno, responsável e professor
- Botão `?` flutuante para replay; persiste estado (completo/pulado) por usuário no banco (`UserOnboarding`)
- Popover estilizado com gradiente violeta

### 8. Page Builder — melhorias

- **Arquivar / Despublicar:** novo modelo `PageConfig` com `liveAt` / `archivedAt`; rota pública retorna 404 automaticamente
- **Deletar versão:** lixeira por versão no histórico (protegida: não permite deletar a única)
- **Limpar página:** reset de blocos para rascunho vazio
- **Gradiente:** campos `bgGradientTo` + `bgGradientDir` nos blocos `hero` e `cta`; preview em tempo real no editor
- **ChatbotWidget** adicionado em todos os 4 layouts (admin, aluno, responsavel, prof)

---

## Decisões técnicas

| Decisão | Motivo |
|---|---|
| `PageConfig` separado de `PageLayout` | Estado de controle (ao vivo/arquivada) não deve estar acoplado ao versionamento de conteúdo |
| Onboarding via `CustomEvent` | Evita prop drilling pelo layout → sidebar; driver.js não conhece React |
| Cores de disciplina como variantes automáticas | Garante consistência visual sem obrigar o admin a escolher 5 cores manualmente |
| `UserOnboarding` com `userId_tourId` unique | Permite múltiplos tours por usuário sem chave composta arbitrária |

---

## Pendências conhecidas

- `TODO(fase-3)` em `prof/page.tsx`: painel do professor ainda é placeholder — conteúdo real na Fase 4
- Portal do responsável: páginas existem mas com dados estáticos/placeholder
- Área de Administração (`/admin/administracao`): rotas criadas, conteúdo pendente
- Financeiro escolar: listagem existe; cobrança real (boleto, Omie K-12) pendente na Fase 4
- `ADR-003`: páginas customizadas com slug livre deferidas (ver `docs/architecture/ADR-003.md`)

---

## Como validar localmente

```bash
npx prisma migrate dev --schema packages/db/prisma/schema.prisma
cd apps/web && npm run dev

# Fluxo de validação
# - Admin: criar unidade → ano letivo → turma → adicionar alunos e professores
# - Lançar notas por frente → gerar boletim → exportar PDF
# - Criar horário semanal → exportar PDF
# - Acessar /p/home antes e depois de despublicar → verificar 404
# - Onboarding: primeiro login de admin → tour de 26 passos com switch de workspace
```

---

## Próximo: Fase 4

Ver proposta abaixo.
