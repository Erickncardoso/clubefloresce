import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "paciente@florescer.com";
  const password = "paciente123";
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      role: "PACIENTE",
      status: "ATIVO",
      name: "Maria Paciente",
    },
    create: {
      email,
      password: hash,
      role: "PACIENTE",
      status: "ATIVO",
      name: "Maria Paciente",
    },
  });

  console.log(`Paciente pronto: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
