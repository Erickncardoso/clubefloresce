import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { PrismaClient, UserStatus } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const email = process.argv[2] || "nutri.isabellajardim@gmail.com";
const newPassword = process.argv[3] || process.env.NUTRI_RESET_PASSWORD;

if (!newPassword) {
  console.error("Informe a senha: node reset-nutri-password.mjs <email> <senha>");
  process.exit(1);
}

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("USER_NOT_FOUND:", email);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hash, status: UserStatus.ATIVO },
  });

  const verify = await bcrypt.compare(newPassword, hash);
  console.log(JSON.stringify({ success: true, email, role: user.role, status: "ATIVO", verify }));
} catch (error) {
  console.error("ERROR:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
