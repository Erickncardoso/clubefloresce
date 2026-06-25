import dotenv from "dotenv";
import {
  APPROVAL_WHATSAPP_TEMPLATE_KEY,
  DEFAULT_APPROVAL_WHATSAPP_TEMPLATE,
  resolveApprovalWhatsappTemplate,
} from "../src/services/approval-whatsapp.service";
import { AppSettingRepository } from "../src/repositories/app-setting.repository";

dotenv.config();

async function main() {
  const repo = new AppSettingRepository();
  const stored = await repo.get(APPROVAL_WHATSAPP_TEMPLATE_KEY);
  const resolved = resolveApprovalWhatsappTemplate(stored);

  if (!stored?.trim() || resolved !== stored.trim()) {
    await repo.set(APPROVAL_WHATSAPP_TEMPLATE_KEY, resolved);
    console.log("Template de WhatsApp atualizado para a versão formatada.");
  } else {
    console.log("Template de WhatsApp já estava atualizado.");
  }

  console.log("\n--- Prévia ---\n");
  console.log(resolved);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
