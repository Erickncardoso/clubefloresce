import { prisma } from "../lib/prisma";

export class AppSettingRepository {
  async get(key: string): Promise<string | null> {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<string> {
    const row = await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return row.value;
  }
}
