import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class WhatsappContactDirectoryRepository {
  /**
   * Retorna o diretório de contatos salvo para o usuário.
   * Retorna {} se ainda não houver registro.
   */
  async getByUserId(userId: string): Promise<Record<string, string>> {
    const row = await prisma.whatsappContactDirectory.findUnique({
      where: { userId }
    });
    if (!row?.data) return {};
    return (row.data as Record<string, string>) ?? {};
  }

  /**
   * Salva (upsert) o diretório completo de contatos do usuário.
   * O campo `data` é um objeto { chave: nome } com todas as variações de JID/phone.
   */
  async upsert(userId: string, data: Record<string, string>): Promise<void> {
    await prisma.whatsappContactDirectory.upsert({
      where: { userId },
      update: { data },
      create: { userId, data }
    });
  }
}
