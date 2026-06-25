# Portal Admin

O portal `/admin` é usado por **administradores e proprietários** da instituição para gerenciar toda a operação escolar e EAD.

---

## Acesso

Roles com acesso: `OWNER`, `ADMINISTRATOR`

---

## Secretaria

### Turmas
`/admin/secretaria/turmas`

Crie e gerencie turmas. Cada turma tem:
- Ano letivo e turno
- Disciplinas vinculadas com professor responsável
- Grade de horários (semanal/quinzenal)

### Alunos e Matrículas
`/admin/secretaria/alunos`

Cadastre alunos e vincule-os a uma turma (matrícula). Na ficha do aluno:
- Dados pessoais
- Histórico de turmas
- Financeiro (mensalidades)
- Responsáveis (pais/guardiões vinculados ao portal do responsável)

### Professores
`/admin/secretaria/professores`

Cadastre professores internamente. Para dar acesso ao portal `/prof`:
- Clique em **"Vincular login"**
- Informe o e-mail — o sistema cria ou vincula um usuário com role `PROFESSOR`

### Disciplinas
`/admin/secretaria/disciplinas`

Crie as disciplinas da grade. Para disciplinas de **Itinerário Formativo** (Novo Ensino Médio):
1. Clique em **"+ itinerário"** na disciplina principal (ex: IFO)
2. Adicione as frentes (trilhas) como sub-disciplinas
3. Na grade de notas da turma, o painel de atribuição de trilhas por aluno aparecerá automaticamente

Veja [Itinerário Formativo](https://github.com/O-Tiger/Nexora-EDU/blob/main/docs/features/itinerario-formativo.md) para o passo a passo completo.

### Grade de Horários
`/admin/secretaria/turmas/[id]/horario`

Monte a grade semanal da turma. Cada célula pode ser:
- **Semanal** — ocorre toda semana
- **Quinzenal Par** — semanas ISO pares
- **Quinzenal Ímpar** — semanas ISO ímpares

### Lançamento de Notas
`/admin/secretaria/turmas/[id]/notas`

Lance e edite notas dos alunos por disciplina. As notas são organizadas em trimestres (1ª AVA, 2ª AVA, 3ª AVA, Recuperação, Prova Final).

Para disciplinas de Itinerário Formativo, atribua a trilha de cada aluno no painel âmbar acima da grade antes de lançar as notas.

### Diário de Classe
`/admin/secretaria/turmas/[id]/diario`

Registre aulas ministradas com:
- Data e disciplina
- Quantidade de aulas geminadas
- Conteúdo abordado
- Chamada dos alunos (presente/falta/justificada)

As faltas do diário alimentam automaticamente o boletim.

### Boletins
`/admin/secretaria/boletins`

Gere boletins em **PDF**, **HTML** ou **Word** para toda a turma ou aluno individual.

---

## EAD

| Seção | URL | O que faz |
|---|---|---|
| Cursos | `/admin/ead/cursos` | Cria e gerencia cursos com módulos e aulas |
| Avaliações | `/admin/ead/avaliacoes` | Cria provas com autocorreção ou correção manual |
| Certificados | `/admin/ead/certificados` | Templates de certificado com validação pública |
| Page Builder | `/admin/ead/paginas` | Editor visual de páginas institucionais |
| Matrículas EAD | `/admin/ead/matriculas` | Vincula alunos a cursos |

---

## Configurações do Tenant
`/admin/configuracoes`

- Nome e logo da instituição
- CNPJ / dados fiscais
- Configurações do boletim (nome, rodapé, assinaturas)
- Integrações (Omie ERP, Digisac WhatsApp, Sentry)

---

## Dicas

- **Primeiro acesso:** configure as **disciplinas** antes de criar turmas — você precisará delas no momento da criação
- **Notas vs. Diário:** o diário substitui as faltas manuais — se um diário for lançado, as notas manuais de frequência ficam inativas para aquela turma
- **Itinerário Formativo:** a trilha deve ser atribuída antes de lançar notas, ou os alunos sem trilha ficarão bloqueados na grade
