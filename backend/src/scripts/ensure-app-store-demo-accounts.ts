/**
 * Contas demo para revisão Apple (App Store Connect).
 * Idempotente — pode rodar várias vezes.
 *
 * Uso: npx ts-node src/scripts/ensure-app-store-demo-accounts.ts
 */
import bcrypt from "bcrypt";
import { PrismaClient, UserPlan, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "AppleReview2026!";

const DEMO_PROFILE = {
  gender: "female",
  birthDate: "1990-05-15",
  heightCm: 165,
  weightKg: 68,
  primaryGoal: "health",
  workoutsPerWeek: "3-5",
} as const;

type DemoAccount = {
  email: string;
  name: string;
  plan: UserPlan;
  accessExpiresAt: Date | null;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "review.limited@clubeflorescer.app",
    name: "Revisão Apple — Acesso limitado",
    plan: UserPlan.FREE,
    accessExpiresAt: null,
  },
  {
    email: "review.full@clubeflorescer.app",
    name: "Revisão Apple — Acesso completo",
    plan: UserPlan.PREMIUM,
    accessExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  },
];

async function upsertDemoAccount(account: DemoAccount, passwordHash: string) {
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email: account.email },
    update: {
      name: account.name,
      password: passwordHash,
      role: "PACIENTE",
      status: UserStatus.ATIVO,
      plan: account.plan,
      accessExpiresAt: account.accessExpiresAt,
      approvalEmailSentAt: now,
      onboardingCompletedAt: now,
      patientProfileData: DEMO_PROFILE,
    },
    create: {
      email: account.email,
      name: account.name,
      password: passwordHash,
      role: "PACIENTE",
      status: UserStatus.ATIVO,
      plan: account.plan,
      accessExpiresAt: account.accessExpiresAt,
      approvalEmailSentAt: now,
      onboardingCompletedAt: now,
      patientProfileData: DEMO_PROFILE,
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      accessExpiresAt: true,
      onboardingCompletedAt: true,
    },
  });

  return user;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Criando/atualizando contas demo para revisão Apple...\n");

  for (const account of DEMO_ACCOUNTS) {
    const user = await upsertDemoAccount(account, passwordHash);
    console.log(`✅ ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Plano: ${user.plan}`);
    console.log(
      `   Acesso até: ${user.accessExpiresAt ? user.accessExpiresAt.toISOString().slice(0, 10) : "— (preview FREE)"}`,
    );
    console.log(`   Onboarding: ${user.onboardingCompletedAt ? "completo" : "pendente"}`);
    console.log("");
  }

  console.log("Senha (ambas as contas):", DEMO_PASSWORD);
  console.log("\nCole em App Store Connect → App Review Information (ver expo-app/docs/APP_STORE_CONNECT.md).");
}

main()
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
