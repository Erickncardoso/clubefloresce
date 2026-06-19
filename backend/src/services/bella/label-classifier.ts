import { UserRepository } from "../../repositories/user.repository";
import { OpenAIClient } from "./openai.client";
import { firstName } from "./patient-context-helpers";
import { getModelForTask } from "./model-config";
import {
  LABEL_ANALYSIS_SECTIONS,
  LABEL_EXTRACTED_DATA_RULES,
  LABEL_SEMAPHORE_CRITERIA_EXTRACTED,
} from "./label-semaphore";
import {
  buildExtractedLabelFactsBlock,
  extractLabelNutritionFromImage,
} from "./label-structured-extractor";
import type { LabelNutritionExtraction } from "../../types/label-analysis.types";
const llm = new OpenAIClient();
const userRepository = new UserRepository();

export function buildIllegibleLabelReply(extraction: LabelNutritionExtraction): string {
  const reason = extraction.illegibleReason?.trim();
  return [
    "## Preciso de uma foto melhor",
    reason
      ? `Não consegui ler a **tabela nutricional** com segurança: ${reason}.`
      : "Não consegui ler a **tabela nutricional** com segurança nesta imagem.",
    "",
    "**O que enviar:** foto com boa luz, sem reflexo forte, mostrando a **porção de referência** e os números da tabela (kcal, carboidrato, proteína, gordura).",
    "",
    "**Dica:** aproxime o celular até os números da porção ficarem nítidos. A lista de ingredientes ajuda, mas **não é obrigatória** se a tabela estiver legível.",
    "",
    "Assim que você mandar outra foto, eu classifico o consumo para você.",
  ].join("\n");
}

function buildClassificationPrompt(
  patientFirstName: string,
  extraction: LabelNutritionExtraction,
  userQuestion: string,
): string {
  const facts = buildExtractedLabelFactsBlock(extraction);

  return `Você é BELLA no chat "Ler rótulo" do Clube Florescer, classificando consumo para ${patientFirstName}.

${LABEL_EXTRACTED_DATA_RULES}

${facts}

${LABEL_SEMAPHORE_CRITERIA_EXTRACTED}

${LABEL_ANALYSIS_SECTIONS}

Regras desta resposta:
- Use EXCLUSIVAMENTE os números da **porção de referência** no bloco "Dados lidos do rótulo".
- PROIBIDO citar proteína, carboidrato ou gordura da coluna 100 g no **Por quê**.
- No **Por quê**, comece citando a porção e os três macros da porção (ex.: "Na porção de 60 g (1 unidade): 6 g proteína, 10 g carboidrato, 0,9 g gordura").
- Se likelyProteinSource e proteína ≤ carboidrato ou proteína < 12 g na porção: mínimo amarelo; nunca "boa quantidade de proteína".

Pergunta do paciente: ${userQuestion || "Classifique o consumo deste produto."}`;
}

export async function analyzeLabelFromImage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  userQuestion: string,
  patientDateKey?: string,
): Promise<string> {
  const extraction = await extractLabelNutritionFromImage(buffer, mimeType);

  if (!extraction.readable) {
    return buildIllegibleLabelReply(extraction);
  }

  if (!llm.isEnabled()) {
    return buildIllegibleLabelReply({
      readable: false,
      illegibleReason: "serviço de IA indisponível",
    });
  }

  const user = await userRepository.findById(userId);
  if (!user) throw new Error("Usuário não encontrado.");
  const patientFirstName = firstName(user.name);
  const model = getModelForTask("chat");
  const prompt = buildClassificationPrompt(patientFirstName, extraction, userQuestion);

  const completion = await llm.complete({
    messages: [{ role: "user", content: prompt }],
    model,
    temperature: 0.15,
    maxTokens: 900,
  });

  return (
    completion.content ||
    "## Preciso de uma foto melhor\n\nNão consegui classificar agora. Tente outra foto com a tabela nutricional mais nítida."
  );
}
