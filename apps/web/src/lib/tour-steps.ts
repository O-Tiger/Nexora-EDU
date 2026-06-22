import type { DriveStep } from "driver.js";
import type { TourId } from "./onboarding";

/**
 * Admin tour workspace transition indices.
 * Step at SWITCH_TO_SECRETARIA triggers workspace switch to "secretaria" on Next.
 * Step at SWITCH_TO_ADMINISTRACAO triggers workspace switch to "administracao" on Next.
 * Keep in sync with the admin steps array below.
 */
export const ADMIN_TOUR_TRANSITIONS = {
  switchToSecretaria: 10,   // last EAD step (Importar Curso)
  switchToAdministracao: 19, // last Secretaria step (Reservas de Vaga)
} as const;

export const TOUR_STEPS: Record<TourId, DriveStep[]> = {
  // ─── ADMIN ────────────────────────────────────────────────────────────────
  // 26 steps: 0-10 = EAD, 11-19 = Secretaria, 20-25 = Administração
  admin: [
    // ── 0 ─ Welcome
    {
      popover: {
        title: "👋 Bem-vindo ao painel!",
        description:
          "Este é o centro de controle da plataforma Nexora EDU. Vamos fazer um tour completo por todos os workspaces e funcionalidades. Use <b>←</b> e <b>→</b> para navegar.",
      },
    },

    // ── 1 ─ Workspace switcher
    {
      element: "[data-tour='workspace-switcher']",
      popover: {
        title: "🔀 Seletor de Workspace",
        description:
          "Clique aqui para alternar entre os três ambientes: <b>Faculdade (EAD)</b>, <b>Secretaria Escolar</b> e <b>Administração</b>. Cada workspace tem seu próprio conjunto de ferramentas.",
        side: "right",
        align: "start",
      },
    },

    // ── 2 ─ EAD intro (centered)
    {
      popover: {
        title: "📚 Workspace — Faculdade (EAD)",
        description:
          "O workspace de <b>Faculdade</b> é a plataforma de ensino à distância. Aqui você cria cursos, gerencia matrículas, acompanha alunos e emite certificados digitais.",
      },
    },

    // ── 3 ─ Dashboard EAD
    {
      element: "[data-tour='admin-nav-dashboard']",
      popover: {
        title: "📊 Dashboard",
        description:
          "Visão geral da plataforma EAD em tempo real: total de alunos ativos, cursos publicados, taxa média de conclusão e últimas atividades registradas no sistema.",
        side: "right",
        align: "center",
      },
    },

    // ── 4 ─ Cursos
    {
      element: "[data-tour='admin-nav-cursos']",
      popover: {
        title: "📘 Cursos",
        description:
          "Crie e organize cursos completos com <b>módulos</b>, <b>aulas em vídeo</b>, <b>materiais em PDF</b> e <b>avaliações integradas</b>. Cada curso pode ser publicado ou mantido em rascunho até estar pronto.",
        side: "right",
        align: "center",
      },
    },

    // ── 5 ─ Alunos EAD
    {
      element: "[data-tour='admin-nav-alunos']",
      popover: {
        title: "🎓 Alunos (EAD)",
        description:
          "Lista de todos os alunos matriculados na plataforma EAD. Acompanhe o <b>progresso individual</b> por curso, visualize notas, tempo assistido e emita certificados de conclusão.",
        side: "right",
        align: "center",
      },
    },

    // ── 6 ─ Matrículas
    {
      element: "[data-tour='admin-nav-matriculas']",
      popover: {
        title: "📋 Matrículas",
        description:
          "Gerencie as inscrições de alunos em cursos específicos. Aprove ou recuse matrículas pendentes, transfira alunos entre turmas e controle o acesso por período letivo.",
        side: "right",
        align: "center",
      },
    },

    // ── 7 ─ Certificados
    {
      element: "[data-tour='admin-nav-certificados']",
      popover: {
        title: "🏆 Certificados",
        description:
          "Visualize e imprima os certificados gerados automaticamente ao aluno concluir 100% de um curso. Personalize o template com logotipo e assinatura digital da instituição.",
        side: "right",
        align: "center",
      },
    },

    // ── 8 ─ Páginas
    {
      element: "[data-tour='admin-nav-paginas']",
      popover: {
        title: "📄 Páginas",
        description:
          "Crie páginas de conteúdo livre para o <b>portal público</b> da instituição — apresentação institucional, regulamentos internos, FAQ, política de privacidade e muito mais.",
        side: "right",
        align: "center",
      },
    },

    // ── 9 ─ Comunicação EAD
    {
      element: "[data-tour='admin-nav-comunicacao']",
      popover: {
        title: "💬 Comunicação",
        description:
          "Envie <b>avisos</b> e <b>mensagens diretas</b> para alunos ou grupos. Use para comunicados de turma, alertas de prazo de avaliação ou notificações gerais do sistema.",
        side: "right",
        align: "center",
      },
    },

    // ── 10 ─ Importar Curso  ← SWITCH TO SECRETARIA on Next
    {
      element: "[data-tour='admin-nav-importar']",
      popover: {
        title: "📥 Importar Curso",
        description:
          "Importe cursos completos via arquivo <b>ZIP</b> ou <b>URL</b>. Compatível com o formato <b>SCORM</b> e pacotes exportados de plataformas como Moodle ou Hotmart.",
        side: "right",
        align: "center",
      },
    },

    // ── 11 ─ Secretaria intro (centered)
    {
      popover: {
        title: "🏫 Workspace — Secretaria Escolar",
        description:
          "O workspace de <b>Secretaria</b> gerencia a escola presencial: turmas, alunos matriculados, professores, boletins, frequência, financeiro e reservas para o próximo ano letivo.",
      },
    },

    // ── 12 ─ Visão Geral Secretaria
    {
      element: "[data-tour='sec-nav-visao']",
      popover: {
        title: "🏠 Visão Geral",
        description:
          "Painel resumido da secretaria: turmas ativas, total de alunos matriculados por unidade, próximos eventos do calendário escolar e alertas de pendências financeiras.",
        side: "right",
        align: "center",
      },
    },

    // ── 13 ─ Unidades & Turmas
    {
      element: "[data-tour='sec-nav-turmas']",
      popover: {
        title: "🏛️ Unidades & Turmas",
        description:
          "Cadastre as <b>unidades (campus)</b> e organize as <b>turmas por ano letivo</b>. Cada turma tem grade de horários, professores associados por disciplina e um código único de identificação.",
        side: "right",
        align: "center",
      },
    },

    // ── 14 ─ Alunos da escola
    {
      element: "[data-tour='sec-nav-alunos']",
      popover: {
        title: "👩‍🎓 Alunos da Escola",
        description:
          "Cadastro completo dos alunos: dados pessoais, <b>responsáveis vinculados</b>, histórico escolar, turma atual, situação financeira e acesso ao portal do responsável.",
        side: "right",
        align: "center",
      },
    },

    // ── 15 ─ Professores
    {
      element: "[data-tour='sec-nav-professores']",
      popover: {
        title: "👨‍🏫 Professores",
        description:
          "Cadastro de professores com suas <b>disciplinas</b>, <b>turmas</b> e <b>carga horária</b>. Cada professor tem acesso ao painel próprio para lançar notas e registrar frequência.",
        side: "right",
        align: "center",
      },
    },

    // ── 16 ─ Disciplinas
    {
      element: "[data-tour='sec-nav-disciplinas']",
      popover: {
        title: "📐 Disciplinas",
        description:
          "Configure as matérias com <b>nome</b>, <b>código</b>, <b>frentes de conteúdo</b> e <b>professor responsável</b>. A cor da disciplina é usada automaticamente no boletim e na grade de horários.",
        side: "right",
        align: "center",
      },
    },

    // ── 17 ─ Boletins
    {
      element: "[data-tour='sec-nav-boletins']",
      popover: {
        title: "📊 Boletins",
        description:
          "Acesse e imprima boletins por turma ou por aluno. Exibe <b>notas por trimestre</b>, <b>frequência</b> e <b>situação final</b> (aprovado/reprovado/recuperação). Disponível em PDF.",
        side: "right",
        align: "center",
      },
    },

    // ── 18 ─ Financeiro
    {
      element: "[data-tour='sec-nav-financeiro']",
      popover: {
        title: "💰 Financeiro",
        description:
          "Gestão completa de mensalidades: <b>emissão de cobranças</b>, <b>baixa de pagamentos</b>, controle de inadimplência, parcelamentos e relatórios mensais por unidade.",
        side: "right",
        align: "center",
      },
    },

    // ── 19 ─ Reservas de Vaga  ← SWITCH TO ADMINISTRACAO on Next
    {
      element: "[data-tour='sec-nav-reservas']",
      popover: {
        title: "📌 Reservas de Vaga",
        description:
          "Gerencie as pré-matrículas para o <b>próximo ano letivo</b>: candidaturas recebidas, documentação pendente, aprovações e remanejamento entre turmas.",
        side: "right",
        align: "center",
      },
    },

    // ── 20 ─ Administração intro (centered)
    {
      popover: {
        title: "🛡️ Workspace — Administração",
        description:
          "O workspace de <b>Administração</b> centraliza o controle das duas instituições. Aqui você gerencia funcionários, redefine senhas, controla permissões e configura integrações institucionais.",
      },
    },

    // ── 21 ─ Instituições
    {
      element: "[data-tour='adm-nav-inst']",
      popover: {
        title: "🏢 Instituições",
        description:
          "Visão global das duas instituições cadastradas — <b>Faculdade</b> e <b>Colégio</b>. Alterne o tenant ativo para gerenciar cada uma de forma independente sem precisar trocar de conta.",
        side: "right",
        align: "center",
      },
    },

    // ── 22 ─ Funcionários
    {
      element: "[data-tour='adm-nav-func']",
      popover: {
        title: "👔 Funcionários",
        description:
          "Adicione e gerencie colaboradores administrativos com perfis de <b>Administrador</b> ou <b>Suporte TI</b>. Desative acessos de forma segura sem excluir o histórico do usuário.",
        side: "right",
        align: "center",
      },
    },

    // ── 23 ─ Suporte Técnico
    {
      element: "[data-tour='adm-nav-suporte']",
      popover: {
        title: "🔧 Suporte Técnico",
        description:
          "Redefina <b>senhas temporárias</b> para qualquer usuário, altere <b>perfis de permissão</b> (exceto OWNER) e monitore acessos suspeitos. Ideal para onboarding de novos colaboradores.",
        side: "right",
        align: "center",
      },
    },

    // ── 24 ─ Configurações
    {
      element: "[data-tour='adm-nav-config']",
      popover: {
        title: "⚙️ Configurações",
        description:
          "Configure o <b>formato do email institucional automático</b> (ex: <code>joao.silva@escola.edu.br</code>), o nome oficial da instituição e dados como CNPJ e endereço para documentos oficiais.",
        side: "right",
        align: "center",
      },
    },

    // ── 25 ─ Final wrap-up
    {
      popover: {
        title: "✅ Tudo pronto!",
        description:
          "Você conheceu todos os módulos da plataforma. Use o <b>seletor de workspace</b> no topo da barra lateral para navegar. Clique no botão <b>?</b> a qualquer momento para rever este guia.",
      },
    },
  ],

  // ─── PROFESSOR ────────────────────────────────────────────────────────────
  professor: [
    {
      popover: {
        title: "👋 Bem-vindo, professor!",
        description:
          "Este é o seu espaço de trabalho para gerenciar turmas, registrar aulas e lançar notas dos alunos.",
      },
    },
    {
      popover: {
        title: "📓 Diário de Classe",
        description:
          "No <b>Diário</b> você registra o conteúdo dado em cada aula e marca a presença dos alunos. O registro é por disciplina e por turma — as faltas são computadas automaticamente no boletim.",
      },
    },
    {
      popover: {
        title: "📊 Lançamento de Notas",
        description:
          "Acesse a turma e selecione <b>Notas</b> para lançar as avaliações por trimestre e frente de conteúdo. Notas abaixo da média de aprovação são destacadas automaticamente em vermelho.",
      },
    },
    {
      popover: {
        title: "✅ Tudo pronto!",
        description:
          "Em caso de dúvidas sobre o sistema, entre em contato com a secretaria ou com o suporte técnico. Clique no botão <b>?</b> para rever este guia.",
      },
    },
  ],

  // ─── ALUNO ────────────────────────────────────────────────────────────────
  aluno: [
    {
      element: "[data-tour='aluno-nav-inicio']",
      popover: {
        title: "🏠 Início",
        description:
          "Sua página inicial com resumo de cursos em andamento, avaliações próximas e avisos recentes da instituição.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='aluno-nav-cursos']",
      popover: {
        title: "📚 Meus Cursos",
        description:
          "Acesse todos os cursos disponíveis para você. Clique em um curso para iniciar as aulas, acompanhar seu progresso e baixar os materiais de cada módulo.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='aluno-nav-avaliacoes']",
      popover: {
        title: "📝 Avaliações",
        description:
          "Veja suas avaliações pendentes e realize-as diretamente pela plataforma dentro do prazo estipulado. Resultados ficam disponíveis assim que o professor lança as notas.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='aluno-nav-comunicacao']",
      popover: {
        title: "💬 Comunicação",
        description:
          "Canal direto com professores e avisos da secretaria. Você pode enviar dúvidas sobre conteúdo e receber respostas sem sair da plataforma.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='aluno-nav-dados']",
      popover: {
        title: "🛡️ Meus Dados",
        description:
          "Gerencie seus dados pessoais e preferências de privacidade conforme a <b>LGPD</b>. Você pode solicitar a exclusão da sua conta ou atualizar suas informações cadastrais.",
        side: "right",
        align: "center",
      },
    },
    {
      popover: {
        title: "✅ Bons estudos!",
        description:
          "Tudo o que você precisa está aqui. Para dúvidas sobre conteúdo use o fórum da aula; para questões administrativas, fale com a secretaria. Clique no botão <b>?</b> para rever este guia.",
      },
    },
  ],

  // ─── RESPONSÁVEL ──────────────────────────────────────────────────────────
  responsavel: [
    {
      popover: {
        title: "👋 Bem-vindo ao Portal!",
        description:
          "Aqui você acompanha o desempenho escolar do seu filho de forma simples e transparente, sem precisar ir até a escola.",
      },
    },
    {
      element: "[data-tour='resp-nav-boletim']",
      popover: {
        title: "📋 Boletim",
        description:
          "Veja as <b>notas por disciplina e trimestre</b> em tempo real. Notas abaixo da média de aprovação são destacadas automaticamente. Disponível para download em PDF.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='resp-nav-frequencia']",
      popover: {
        title: "📅 Frequência",
        description:
          "Acompanhe as <b>faltas acumuladas</b> por disciplina ao longo do período letivo. O sistema alerta quando o aluno se aproxima do limite de faltas permitido (25% da carga horária).",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='resp-nav-calendario']",
      popover: {
        title: "🗓️ Calendário",
        description:
          "Visualize os <b>próximos eventos</b> da turma: provas, reuniões de pais, excursões, entrega de trabalhos e feriados. Eventos passados ficam registrados no histórico.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='resp-nav-mensalidades']",
      popover: {
        title: "💳 Mensalidades",
        description:
          "Acompanhe a <b>situação financeira</b> por mês: mensalidades pagas, pendentes e vencidas. Em caso de pendências ou dúvidas sobre valores, entre em contato com a secretaria.",
        side: "right",
        align: "center",
      },
    },
    {
      popover: {
        title: "✅ Tudo pronto!",
        description:
          "Para alterar sua senha ou dados de acesso, entre em contato com a secretaria da escola. Clique no botão <b>?</b> a qualquer momento para rever este guia.",
      },
    },
  ],
};
