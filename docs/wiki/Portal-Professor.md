# Portal do Professor

O portal `/prof` permite ao professor lançar notas, registrar aulas no diário de classe e visualizar a grade de horários — com acesso restrito às disciplinas que ministra.

---

## Acesso

Role necessária: `PROFESSOR`

Além da role, o professor precisa ter um cadastro interno vinculado ao login. O admin faz esse vínculo em `/admin/secretaria/professores` → **"Vincular login"**.

---

## Funcionalidades

### Minhas Turmas (`/prof/turmas`)

Lista todas as turmas onde o professor tem pelo menos uma disciplina vinculada. Clique em uma turma para acessar notas e diário.

### Lançar Notas (`/prof/turmas/[id]/notas`)

Grade de notas com as disciplinas que o professor ministra na turma:
- Colunas: 1ª AVA, 2ª AVA, 3ª AVA, Recuperação, Prova Final
- Para disciplinas de Itinerário Formativo: alunos de outras trilhas ficam bloqueados — o badge mostra qual trilha o aluno está
- Salvar é automático ao sair da célula

> O professor não vê a configuração de disciplinas da turma — apenas o lançamento de notas.

### Diário de Classe (`/prof/turmas/[id]/diario`)

Registre aulas ministradas:

1. Selecione a data e a disciplina
2. Informe a quantidade de aulas geminadas e o conteúdo abordado
3. Faça a chamada (presente / falta / justificada)

O sistema filtra automaticamente as disciplinas disponíveis no dia selecionado com base na grade de horários e paridade da semana (aulas quinzenais).

### Grade de Horários (`/prof/horario`)

Visualização da grade semanal de todas as suas turmas. Células com aulas quinzenais exibem badges **PAR** e **ÍMPAR** empilhados.

---

## Segurança

O professor vê apenas dados das turmas e disciplinas que ministra. Qualquer tentativa de acessar dados de outra turma redireciona para `/unauthorized`.

---

## Perguntas frequentes do professor

**Não consigo acessar o portal — aparece "Sem permissão".**
Você tem conta mas pode ainda não ter sido vinculado como professor interno. Fale com o administrador para que ele acesse `/admin/secretaria/professores` e vincule seu login.

**A disciplina não aparece no diário da data que selecionei.**
A grade de horários filtra as disciplinas disponíveis por dia e paridade. Se a aula é quinzenal e a semana é par, apenas as disciplinas quinzenais pares aparecem. Verifique se a grade está configurada corretamente com o administrador.

**Aluno aparece bloqueado na grade de notas.**
Esse aluno está em outra trilha de Itinerário Formativo. A atribuição de trilha é feita pelo administrador — contate a secretaria.
