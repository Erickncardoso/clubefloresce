import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

// Carregando o .env explicitamente da mesma pasta onde este script está (backend)
dotenv.config({ path: path.join(__dirname, ".env") });

const prisma = new PrismaClient();

async function main() {
  const email = "novo@florescer.com";
  const password = "senha";
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword, role: "NUTRICIONISTA" },
      create: { 
        name: "Novo Nutricionista", 
        email, 
        password: hashedPassword, 
        role: "NUTRICIONISTA" 
      }
    });
    
    console.log("✅ Usuário criado com SUCESSO no banco correto!");
    console.log("Banco conectado:", process.env.DATABASE_URL?.split('@')[1]);
    console.log("-----------------------------------");
    console.log("E-mail: " + email);
    console.log("Senha: " + password);
    console.log("-----------------------------------");
  } catch(e) {
    console.error("❌ Erro ao criar usuário:", e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
