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

## Formato obrigatório da seção Semáforo
Sempre inclua esta seção (com o emoji correspondente):

## Semáforo
🟢 Verde — Liberado
(ou 🟡 Amarelo — Consumir com moderação / 🔴 Vermelho — Evitar ou consumir raramente)

**Por quê:** [justificativa clara citando ingredientes e/ou nutrientes visíveis]
**Sugestão:** [como usar no dia a dia: frequência, porção, alternativa melhor se amarelo/vermelho]

Regras finais:
- Não invente números ou ingredientes ilegíveis; diga "Não legível" e classifique com cautela.
- Não prescreva dieta personalizada; lembre que a nutricionista do Clube Florescer orienta o plano individual.
- Se faltar foto ou dados, peça imagem nítida do rótulo (ingredientes + tabela) antes de classificar.`;

/** Estrutura markdown esperada na resposta de análise de rótulo. */
export const LABEL_ANALYSIS_SECTIONS = `Responda em markdown com estas seções (omitir só se não houver dados legíveis):

## Semáforo
(Obrigatório: emoji + classificação + Por quê + Sugestão)

## Produto
Nome do produto ou "Não visível na imagem"

## Grau de processamento
NOVA estimado (1 a 4) e breve explicação

## Porção e calorias
Porção declarada e kcal por porção

## Nutrientes de atenção
- Açúcares / açúcar adicionado: ...
- Gordura saturada: ...
- Gordura trans: ... (ou "Não informado")
- Sódio: ...
- Fibras: ... (ponto positivo se adequado)
- Proteínas: ... (ponto positivo se adequado)

## Ingredientes
- Liste os 5 primeiros ingredientes visíveis
- Destaque aditivos, xaropes, aromatizantes ou fibras isoladas se houver

## Pontos positivos
- O que favorece a escolha (se houver)

## Pontos de atenção
- O que limita ou exige moderação`;

export function buildLabelChatSemaphoreGuide(): string {
  return `${LABEL_SEMAPHORE_CRITERIA}

Quando o paciente enviar só texto (sem foto), explique o sistema de semáforo e peça a foto do rótulo para classificar.
Se descrever um produto conhecido, faça análise educativa com ressalva de que a classificação definitiva depende do rótulo real.`;
}
