import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import whatsappMessageHistoryBackfillService from "../services/whatsapp-message-history-backfill.service";

dotenv.config();

async function resolveUserId(): Promise<string> {
  const explicit = String(process.env.WHATSAPP_BACKFILL_USER_ID || "").trim();
  if (explicit) return explicit;

  const nutri = await prisma.user.findFirst({
    where: { role: "NUTRICIONISTA" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (nutri) {
    console.log(`Usuário: ${nutri.email} (${nutri.id})`);
    return nutri.id;
  }

  const chat = await prisma.whatsappChat.findFirst({ select: { userId: true } });
  if (chat?.userId) return chat.userId;

  throw new Error("Nenhum usuário encontrado. Defina WHATSAPP_BACKFILL_USER_ID.");
}

async function main() {
  const userId = await resolveUserId();
  const force = process.argv.includes("--force");
  const chatArg = process.argv.find((arg) => arg.startsWith("--chat="));
  const chatJids = chatArg ? [chatArg.replace("--chat=", "").trim()] : undefined;

  console.log("Iniciando backfill de histórico WhatsApp…");
  console.log("Mantenha o WhatsApp aberto no celular durante o processo.");

  const stats = await whatsappMessageHistoryBackfillService.runBackfill(userId, {
    force,
    chatJids,
    reason: "cli-script",
  });

  const total = await prisma.whatsappMessage.count({ where: { userId } });
  console.log("Backfill concluído:", JSON.stringify(stats, null, 2));
  console.log(`Total de mensagens no banco local: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
