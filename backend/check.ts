import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@florescer.com" },
    update: { password: hashedPassword, role: "NUTRICIONISTA" },
    create: { name: "Administrador", email: "admin@florescer.com", password: hashedPassword, role: "NUTRICIONISTA" }
  });
  console.log("Admin user created/updated successfully.");
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
