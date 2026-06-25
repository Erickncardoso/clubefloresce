import dotenv from "dotenv";
import { UserMgmtRepository } from "../src/repositories/user_mgmt.repository";

dotenv.config();

async function main() {
  const repo = new UserMgmtRepository();
  const result = await repo.syncPhonesFromRegistrationRequests();

  console.log("Sincronização de WhatsApp concluída.");
  console.log(`Verificadas: ${result.checkedCount}`);
  console.log(`Atualizadas: ${result.syncedCount}`);
  console.log(`Ignoradas: ${result.skippedCount}`);

  if (result.synced.length) {
    console.log("\nAlunas atualizadas:");
    for (const item of result.synced) {
      console.log(`- ${item.name} (${item.email}) → ${item.phone}`);
    }
  }

  if (result.skipped.length) {
    console.log("\nSem WhatsApp válido na solicitação:");
    for (const item of result.skipped) {
      console.log(`- ${item.name} (${item.email}): ${item.reason}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
