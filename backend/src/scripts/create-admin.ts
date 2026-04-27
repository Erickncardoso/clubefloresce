import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createAdmin() {
  const email = "admin@florescer.com";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const admin = await prisma.user.create({
      data: {
        name: "Administrador Nutricionista",
        email: email,
        password: hashedPassword,
        role: "NUTRICIONISTA",
      },
    });
    console.log("✅ Usuário Admin criado com sucesso!");
    console.log("📧 E-mail:", email);
    console.log("🔑 Senha:", password);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao criar admin (provavelmente já existe):", message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
