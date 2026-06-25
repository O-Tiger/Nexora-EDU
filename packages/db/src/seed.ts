import { PrismaClient, Role } from "@prisma/client";
import { hash } from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Nexora EDU development database...");

  // ─── Usuários ────────────────────────────────────────────────────────────

  const superAdminHash = await hash("nexora@superadmin");
  const adminHash = await hash("nexora@admin");
  const profHash = await hash("nexora@prof");
  const alunoHash = await hash("nexora@aluno");
  const crossHash = await hash("nexora@cross");

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@nexora.edu" },
    update: { passwordHash: superAdminHash },
    create: { email: "superadmin@nexora.edu", passwordHash: superAdminHash, name: "Super Admin" },
  });

  const adminA = await prisma.user.upsert({
    where: { email: "admin.a@nexora.edu" },
    update: { passwordHash: adminHash },
    create: { email: "admin.a@nexora.edu", passwordHash: adminHash, name: "Admin Faculdade" },
  });

  const adminB = await prisma.user.upsert({
    where: { email: "admin.b@nexora.edu" },
    update: { passwordHash: adminHash },
    create: { email: "admin.b@nexora.edu", passwordHash: adminHash, name: "Admin Colégio" },
  });

  const profA = await prisma.user.upsert({
    where: { email: "prof.a@nexora.edu" },
    update: { passwordHash: profHash },
    create: { email: "prof.a@nexora.edu", passwordHash: profHash, name: "Prof. Ana Lima" },
  });

  const profB = await prisma.user.upsert({
    where: { email: "prof.b@nexora.edu" },
    update: { passwordHash: profHash },
    create: { email: "prof.b@nexora.edu", passwordHash: profHash, name: "Prof. Bruno Melo" },
  });

  const aluno1 = await prisma.user.upsert({
    where: { email: "aluno1@nexora.edu" },
    update: { passwordHash: alunoHash },
    create: { email: "aluno1@nexora.edu", passwordHash: alunoHash, name: "Carlos Souza" },
  });

  const aluno2 = await prisma.user.upsert({
    where: { email: "aluno2@nexora.edu" },
    update: { passwordHash: alunoHash },
    create: { email: "aluno2@nexora.edu", passwordHash: alunoHash, name: "Diana Costa" },
  });

  const aluno3 = await prisma.user.upsert({
    where: { email: "aluno3@nexora.edu" },
    update: { passwordHash: alunoHash },
    create: { email: "aluno3@nexora.edu", passwordHash: alunoHash, name: "Eduardo Ferreira" },
  });

  const crossUser = await prisma.user.upsert({
    where: { email: "cross@nexora.edu" },
    update: { passwordHash: crossHash },
    create: { email: "cross@nexora.edu", passwordHash: crossHash, name: "Fernanda Dias" },
  });

  // ─── Vínculos TenantMembership ────────────────────────────────────────────

  const memberships = [
    // Super admin: acesso a ambos os tenants
    { userId: superAdmin.id, tenantId: "inst_a", role: Role.OWNER },
    { userId: superAdmin.id, tenantId: "inst_b", role: Role.OWNER },

    // Admins
    { userId: adminA.id, tenantId: "inst_a", role: Role.ADMINISTRATOR },
    { userId: adminB.id, tenantId: "inst_b", role: Role.ADMINISTRATOR },

    // Professores
    { userId: profA.id, tenantId: "inst_a", role: Role.PROFESSOR },
    { userId: profB.id, tenantId: "inst_b", role: Role.PROFESSOR },

    // Alunos na Inst.A
    { userId: aluno1.id, tenantId: "inst_a", role: Role.STUDENT },
    { userId: aluno2.id, tenantId: "inst_a", role: Role.STUDENT },
    { userId: aluno3.id, tenantId: "inst_a", role: Role.STUDENT },

    // Usuário cross-tenant: professor no Colégio + aluno na Faculdade
    { userId: crossUser.id, tenantId: "inst_b", role: Role.PROFESSOR },
    { userId: crossUser.id, tenantId: "inst_a", role: Role.STUDENT },
  ];

  for (const m of memberships) {
    await prisma.tenantMembership.upsert({
      where: {
        userId_tenantId_role: {
          userId: m.userId,
          tenantId: m.tenantId,
          role: m.role,
        },
      },
      update: {},
      create: m,
    });
  }

  // ─── Curso de exemplo (Inst.A) ────────────────────────────────────────────

  const course = await prisma.course.upsert({
    where: { tenantId_slug: { tenantId: "inst_a", slug: "introducao-plataforma" } },
    update: {},
    create: {
      tenantId: "inst_a",
      slug: "introducao-plataforma",
      title: "Introdução à Plataforma",
      description: "Curso de onboarding para novos alunos da Nexora EDU.",
      status: "PUBLISHED",
      hoursTotal: 2,
    },
  });

  const mod1 = await prisma.module.upsert({
    where: { id: "seed-mod-01" },
    update: {},
    create: {
      id: "seed-mod-01",
      courseId: course.id,
      title: "Bem-vindo",
      position: 1,
    },
  });

  await prisma.lesson.upsert({
    where: { id: "seed-lesson-01" },
    update: {},
    create: {
      id: "seed-lesson-01",
      moduleId: mod1.id,
      title: "Como navegar na plataforma",
      type: "VIDEO",
      position: 1,
      videoRef: "seed-video-ref-001",
    },
  });

  await prisma.lesson.upsert({
    where: { id: "seed-lesson-02" },
    update: {},
    create: {
      id: "seed-lesson-02",
      moduleId: mod1.id,
      title: "Material de apoio",
      type: "PDF",
      position: 2,
      fileKey: "inst_a/seed/material-apoio.pdf",
    },
  });

  // Matrícula do aluno1 no curso de exemplo
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: aluno1.id, courseId: course.id } },
    update: {},
    create: {
      userId: aluno1.id,
      courseId: course.id,
      tenantId: "inst_a",
      status: "ACTIVE",
    },
  });

  console.log("✅ Seed concluído.");
  console.log("");
  console.log("Credenciais de acesso:");
  console.log("  superadmin@nexora.edu  /  nexora@superadmin  (OWNER em inst_a + inst_b)");
  console.log("  admin.a@nexora.edu     /  nexora@admin       (ADMIN em inst_a)");
  console.log("  admin.b@nexora.edu     /  nexora@admin       (ADMIN em inst_b)");
  console.log("  prof.a@nexora.edu      /  nexora@prof        (PROFESSOR em inst_a)");
  console.log("  prof.b@nexora.edu      /  nexora@prof        (PROFESSOR em inst_b)");
  console.log("  aluno1@nexora.edu      /  nexora@aluno       (ALUNO em inst_a)");
  console.log("  aluno2@nexora.edu      /  nexora@aluno       (ALUNO em inst_a)");
  console.log("  aluno3@nexora.edu      /  nexora@aluno       (ALUNO em inst_a)");
  console.log("  cross@nexora.edu       /  nexora@cross       (PROFESSOR inst_b + ALUNO inst_a)");
}

main()
  .catch((e) => {
    console.error("[seed] Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
