# Perguntas Frequentes (FAQ)

## Geral

**O Nexora EDU é gratuito?**
O código-fonte está disponível publicamente, mas uso comercial (como SaaS, revenda ou hospedagem paga para terceiros) requer autorização. Veja a [licença ELv2](https://github.com/O-Tiger/Nexora-EDU/blob/main/LICENSE).

**Posso usar o Nexora EDU para a minha escola?**
Sim, para uso interno (sua própria instituição). Hospedar como serviço para outras escolas requer contato com o autor.

---

## Configuração e Deploy

**Quais são os requisitos mínimos para rodar em produção?**
- Node.js 20+
- PostgreSQL 16+
- Redis (Upstash ou qualquer Redis compatível)

No Railway, os plugins de PostgreSQL e Upstash são adicionados com um clique.

**Preciso de SMTP configurado para rodar localmente?**
Não. Em desenvolvimento, e-mails são logados no console. Apenas configure `RESEND_API_KEY` em produção para envio real.

**O seed pode ser executado em produção?**
Não. O seed é apenas para desenvolvimento. Em produção, crie os usuários manualmente pelo painel admin ou via invitation flow.

**Como atualizo o sistema para uma nova versão?**
1. `git pull origin main`
2. `npm install`
3. `npm run db:migrate` (aplica migrations novas)
4. Reinicie o servidor

---

## Secretaria e Pedagógico

**Como cadastro o primeiro aluno?**
1. Crie uma turma em `/admin/secretaria/turmas`
2. Vá para `/admin/secretaria/alunos` e crie o aluno
3. Na ficha do aluno, clique em "Matricular" e selecione a turma

**Como o professor acessa o portal?**
1. Cadastre o professor em `/admin/secretaria/professores`
2. Clique em "Vincular login" e informe o e-mail do professor
3. O professor recebe acesso ao portal `/prof`

**O que é Itinerário Formativo?**
É uma modalidade de disciplina eletiva do Novo Ensino Médio brasileiro onde cada aluno escolhe uma trilha (ex: Marketing, Tecnologia). Veja o [guia completo](https://github.com/O-Tiger/Nexora-EDU/blob/main/docs/features/itinerario-formativo.md).

**Como as faltas do boletim são calculadas?**
Se a turma tem diário de classe lançado, as faltas vêm das chamadas registradas. Se não, vêm do lançamento manual de frequência. As duas fontes não se misturam por turma.

**Posso ter aulas quinzenais na grade de horários?**
Sim. Ao configurar a grade em `/admin/secretaria/turmas/[id]/horario`, selecione "Quinzenal Par" ou "Quinzenal Ímpar" para cada célula. O diário de classe filtra automaticamente as disciplinas disponíveis por paridade da semana.

---

## Portal do Responsável

**Como o responsável recebe o acesso?**
O admin cadastra o vínculo na ficha do aluno (aba Responsáveis). O responsável recebe um convite por e-mail.

**O responsável pode ver dados de outros alunos?**
Não. O sistema verifica ownership em todas as páginas — um responsável só acessa dados dos filhos vinculados ao seu cadastro.

---

## Problemas Comuns

**`prisma migrate dev` travou ou deu erro de "non-interactive".**
Esse erro ocorre em terminais integrados de IDEs. Execute o comando em um terminal externo (PowerShell ou Terminal fora da IDE).

**Login falha com "CredentialsSignin" mesmo com senha correta.**
Provavelmente o hash no banco está desatualizado. Re-execute o seed: `npm run db:seed`. O seed re-cria todos os hashes das contas de teste.

**Build falha com erro de TypeScript.**
Execute `npm run typecheck` para ver os erros completos. Erros de Prisma geralmente indicam que o client não foi regenerado após uma migration — rode `cd packages/db && npx prisma generate`.

**Docker Compose não sobe.**
Verifique se o Docker Desktop está rodando. Para limpar e recriar os containers: `docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d`.

---

## Contribuições

Veja o guia [CONTRIBUTING.md](https://github.com/O-Tiger/Nexora-EDU/blob/main/CONTRIBUTING.md) para como reportar bugs, sugerir funcionalidades e enviar pull requests.

Para vulnerabilidades de segurança, veja [SECURITY.md](https://github.com/O-Tiger/Nexora-EDU/blob/main/SECURITY.md) — **nunca abra uma issue pública**.
