/**
 * Critérios de avaliação de rótulos por semáforo (Verde / Amarelo / Vermelho).
 * Inspirado em boas práticas de leitura de rótulo e classificação NOVA,
 * alinhado ao modelo do Desrotulando (processamento, ingredientes e tabela nutricional).
 */

export type LabelSemaphore = "green" | "yellow" | "red";

export const LABEL_SEMAPHORE_LABELS: Record<LabelSemaphore, string> = {
  green: "Verde — Liberado",
  yellow: "Amarelo — Consumir com moderação",
  red: "Vermelho — Evitar ou consumir raramente",
};

export const LABEL_SEMAPHORE_EMOJI: Record<LabelSemaphore, string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
};

/** Texto de critérios injetado nos prompts da Bella (rótulo). */
export const LABEL_SEMAPHORE_CRITERIA = `## Sistema de semáforo (OBRIGATÓRIO em toda análise de rótulo)

Toda análise DEVE terminar com um veredicto de semáforo. Use EXATAMENTE uma destas classificações:

### 🟢 Verde — Liberado
Use quando o produto for adequado para consumo regular no dia a dia:
- Alimentos in natura ou minimamente processados (NOVA 1–2): poucos ingredientes reconhecíveis, sem aditivos industrializados.
- Processados (NOVA 3) com lista de ingredientes curta e "limpa" (sem xaropes, realçadores, corantes artificiais, aromatizantes sintéticos).
- Tabela nutricional favorável: baixo açúcar adicionado, sódio moderado, sem gordura trans, fibras e/ou proteínas presentes quando couber.
- Castanhas, sementes, pasta de amendoim pura, cacau em pó, coco ralado: gordura saturada natural NÃO penaliza como ultraprocessado; avalie o contexto (produto puro, sem aditivos).

### 🟡 Amarelo — Consumir com moderação
Use quando o produto puder entrar na rotina, mas com atenção à frequência ou porção:
- Processados ou ultraprocessados (NOVA 3–4) com lista de ingredientes relativamente boa (poucos aditivos problemáticos).
- Tabela nutricional aceitável, porém com 1 nutriente de atenção em excesso (açúcar adicionado, sódio ou gordura saturada adicionada).
- Granola, iogurte com açúcar moderado, produtos "light" ainda com aditivos.
- Consumo ocasional ok; sugira combinar com alimentos in natura e moderar porção.

### 🔴 Vermelho — Evitar ou consumir raramente
Use quando o produto não for recomendado para consumo frequente:
- Ultraprocessados (NOVA 4) com lista longa de ingredientes industrializados (xaropes, aromatizantes, corantes, realçadores de sabor, emulsificantes em excesso).
- Tabela nutricional desfavorável: múltiplos nutrientes de atenção em excesso ao mesmo tempo (açúcar + sódio + gordura saturada).
- Gordura trans artificial (qualquer presença).
- Açúcar, xarope ou gordura hidrogenada entre os 3 primeiros ingredientes.
- Fibras isoladas adicionadas em vez de fibras naturais dos ingredientes (indicador negativo).
- Água de coco reconstituída (passou por concentração antes da embalagem).
- Adoçantes + aromas + realçadores projetados para hiperpalatabilidade (estimulam comer mais).
- Produtos que, pelo conjunto ingredientes + tabela, fazem mal à saúde se consumidos com frequência.

## Como decidir (ordem de análise)
1. Leia a lista de ingredientes (primeiros 5): reconhecíveis? aditivos? ordem do açúcar?
2. Classifique o grau de processamento (NOVA 1 a 4) com base nos ingredientes.
3. Avalie a tabela nutricional por porção: calorias, açúcares totais/adicionados, gordura saturada, gordura trans, sódio, fibras, proteínas.
4. Aplique contexto especial (castanhas naturais, minimamente processados ricos em gordura boa).
5. Escolha UMA cor do semáforo e justifique em 2–4 frases objetivas.

## Formato obrigatório da resposta (ÚNICA seção visível ao paciente)
Responda SOMENTE com esta seção. Não crie outras seções (sem Produto, Ingredientes, Nutrientes, etc.):

## Classificação do consumo
🟢 Verde — Liberado
(ou 🟡 Amarelo — Consumir com moderação / 🔴 Vermelho — Evitar ou consumir raramente)

**Por quê:** [justificativa clara em linguagem simples, sem listar ingredientes um a um]
**Sugestão:** [como usar no dia a dia: frequência, porção ou cuidado se amarelo/vermelho]

Se a classificação for 🔴 Vermelho, inclua OBRIGATORIAMENTE também:
**Alternativa melhor:** 🟢 ou 🟡 [opção de consumo ou produto equivalente na mesma categoria alimentar, mais saudável e prática no dia a dia. Ex.: margarina com gordura hidrogenada → manteiga ou azeite; biscoito recheado → biscoito integral simples ou fruta; refrigerante → água com limão ou chá sem açúcar]

Regras finais:
- NUNCA use o título "Semáforo" na resposta. Use apenas "Classificação do consumo".
- NUNCA inclua seções ## Produto, ## Ingredientes, ## Nutrientes de atenção ou listas de ingredientes.
- Em 🔴 Vermelho, a **Alternativa melhor** é obrigatória e deve ser verde ou amarela, do mesmo tipo de alimento/uso.
- Não invente números ilegíveis; diga "Não legível" e classifique com cautela.
- Não prescreva dieta personalizada; lembre que a nutricionista do Clube Florescer orienta o plano individual.
- Se faltar foto ou dados, peça imagem nítida do rótulo antes de classificar.`;

/** Estrutura markdown esperada na resposta de análise de rótulo. */
export const LABEL_ANALYSIS_SECTIONS = `Responda em markdown APENAS com:

## Classificação do consumo
(Obrigatório: emoji + classificação + Por quê + Sugestão)
(Se 🔴 Vermelho: inclua também **Alternativa melhor** com opção 🟢 ou 🟡 equivalente na mesma categoria)

Proibido na resposta ao paciente:
- Título "Semáforo"
- Seções ## Produto, ## Ingredientes ou listagem de ingredientes
- Seções extras de tabela nutricional detalhada`;

export function buildLabelChatSemaphoreGuide(): string {
  return `${LABEL_SEMAPHORE_CRITERIA}

Quando o paciente enviar só texto (sem foto), explique a classificação do consumo (verde, amarelo ou vermelho) e peça a foto do rótulo para analisar.
Se descrever um produto conhecido, faça análise educativa com ressalva de que a classificação definitiva depende do rótulo real.`;
}
