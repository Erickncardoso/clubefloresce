const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name ILIKE '%whatsapp%'
      ORDER BY table_name
    `;
    console.log("Tabelas WhatsApp:", tables);

    for (const name of ["WhatsappChat", "WhatsappMessage", "WhatsappContactDirectory", "WhatsappContactState", "WhatsappGroupObservedSenders", "WhatsappInstance"]) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${name}"`);
        console.log(`${name}:`, count[0]?.count ?? 0, "registros");
      } catch (e) {
        console.log(`${name}: NAO EXISTE ou erro -`, e.message?.split("\n")[0]);
      }
    }

    const chatCols = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'WhatsappChat'
      ORDER BY ordinal_position
    `;
    console.log("Colunas WhatsappChat:", chatCols);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
