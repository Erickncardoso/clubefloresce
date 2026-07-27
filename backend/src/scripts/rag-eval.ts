import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { ragRetrievalService } from "../services/rag/retrieval.service";

dotenv.config();

const GOLDEN_QUESTIONS = [
  "Como funciona o jejum intermitente?",
  "Quais alimentos são bons para hidratação?",
  "Posso comer doce no fim de semana?",
  "O que é proteína de alto valor biológico?",
  "Como substituir arroz branco?",
  "Receitas com frango grelhado",
  "Dicas para melhorar o sono",
  "O que comer antes do treino?",
  "Como ler tabela nutricional?",
  "Benefícios da fibra alimentar",
  "Posso tomar whey protein?",
  "Como montar lanche da tarde",
  "Alimentos ricos em ferro",
  "Diferença entre gordura boa e ruim",
  "Como manter aderência ao plano",
  "O que é índice glicêmico?",
  "Posso comer frutas à noite?",
  "Quantas calorias tem abacate?",
  "Substituto do pão francês",
  "Como funciona o check-in semanal?",
  "Alimentos anti-inflamatórios",
  "Posso tomar café com leite?",
  "Como calcular proteína diária?",
  "Receitas low carb",
  "O que é microbiota intestinal?",
  "Posso comer chocolate amargo?",
  "Como evitar efeito sanfona",
  "Alimentos ricos em magnésio",
  "Dicas para organizar marmitas",
];

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Uso: ts-node src/scripts/rag-eval.ts <userId>");
    process.exit(1);
  }

  let matched = 0;
  for (const query of GOLDEN_QUESTIONS) {
    const result = await ragRetrievalService.retrieve({
      userId,
      query,
      limit: 3,
      skipLogging: true,
    });
    const status = result.matched ? "OK" : "MISS";
    if (result.matched) matched += 1;
    console.log(`[${status}] score=${result.topScore?.toFixed(3) ?? "—"} | ${query}`);
    if (result.chunks[0]) {
      console.log(`       -> ${result.chunks[0].title}`);
    }
  }

  console.log(`\n[RAG Eval] ${matched}/${GOLDEN_QUESTIONS.length} com match acima do limiar.`);

  await prisma.ragQueryLog.create({
    data: {
      userId,
      query: `[eval-batch] ${matched}/${GOLDEN_QUESTIONS.length}`,
      matched: matched > 0,
      topScore: matched / GOLDEN_QUESTIONS.length,
      expandedQueries: GOLDEN_QUESTIONS,
    },
  });
}

main()
  .catch((error) => {
    console.error("[RAG Eval] Falha:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
