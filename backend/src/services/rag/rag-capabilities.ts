import { prisma } from "../../lib/prisma";

let pgVectorAvailable: boolean | null = null;

export async function isPgVectorAvailable(): Promise<boolean> {
  if (pgVectorAvailable !== null) return pgVectorAvailable;

  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) AS exists
    `;
    pgVectorAvailable = Boolean(rows[0]?.exists);
  } catch {
    pgVectorAvailable = false;
  }

  return pgVectorAvailable;
}

export function resetPgVectorCache(): void {
  pgVectorAvailable = null;
}
