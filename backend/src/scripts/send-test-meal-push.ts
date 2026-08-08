/**
 * One-off: push de teste de almoço para um e-mail.
 * Uso: npx ts-node src/scripts/send-test-meal-push.ts erickpsncardoso@gmail.com
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { NotificationRepository } from "../repositories/notification.repository";
import { buildMealReminderBody, buildMealReminderTitle } from "../utils/meal-reminder-copy";
import {
  activeMeals,
  mealSlotDisplayLabel,
  normalizeMealSlotKey,
} from "../utils/meal-plan-options";
import type { ParsedMealPlan } from "../types/meal-plan.types";
import { isVapidConfigured } from "../utils/vapid-config";

async function main() {
  const email = String(process.argv[2] || "")
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error("Informe o e-mail. Ex.: npx ts-node src/scripts/send-test-meal-push.ts user@email.com");
  }

  if (!isVapidConfigured()) {
    throw new Error("VAPID não configurada no .env.");
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      name: true,
      patientMealPlan: { select: { plan: true } },
      pushSubscriptions: { select: { id: true } },
    },
  });

  if (!user) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  if (!user.pushSubscriptions.length) {
    throw new Error(`Conta ${email} sem subscription de push. Ative notificações no app/PWA.`);
  }

  const rawPlan = user.patientMealPlan?.plan as ParsedMealPlan | null;
  const planMeals = Array.isArray(rawPlan?.meals) ? rawPlan!.meals : [];
  const selected = rawPlan?.selectedMealBySlot;
  const meals = activeMeals(planMeals, selected);

  const lunch =
    meals.find((meal) => {
      const slot = normalizeMealSlotKey(meal.label);
      const label = String(meal.label || "").toLowerCase();
      return slot.includes("almoco") || slot.includes("almoço") || label.includes("almoço") || label.includes("almoco");
    }) || null;

  const label = mealSlotDisplayLabel(lunch?.label || "Almoço");
  const title = buildMealReminderTitle({ label });
  const body = lunch?.items?.length
    ? buildMealReminderBody({ items: lunch.items })
    : "Arroz · feijão · proteína · salada — toque para abrir o plano.";

  const sourceKey = `meal-reminder-test:${new Date().toISOString().slice(0, 16)}:${user.id}`;
  const repo = new NotificationRepository();

  await repo.upsertBySourceKey({
    userId: user.id,
    type: "meal",
    title,
    body,
    actionPath: lunch?.id ? `/dieta?meal=${encodeURIComponent(lunch.id)}` : "/dieta",
    sourceKey,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: user.email,
        devices: user.pushSubscriptions.length,
        title,
        body,
        mealId: lunch?.id || null,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
