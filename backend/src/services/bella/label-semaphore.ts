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

export const LABEL_ILLEGIBLE_PHOTO_RULES = `## Quando a foto NÃO estiver legível (PRIORIDADE MÁXIMA — antes de classificar)

Antes de dar qualquer semáforo, verifique se consegue ler com **certeza** na imagem:
- Tabela nutricional (porção de referência, calorias, carboidratos, proteínas, gorduras; idealmente sódio)
- Lista de ingredientes ajuda, mas **não é obrigatória** se a tabela nutricional estiver nítida

**Peça nova foto (e NÃO classifique)** se a imagem estiver escura, borrada, cortada, muito pequena, com reflexo, tremida, ou se os números da **porção/tabela** estiverem ilegíveis ou duvidosos.

**É PROIBIDO quando a leitura não for confiável:**
- Inventar, estimar, arredondar ou "chutar" gramas de proteína, carboidrato, gordura, sódio ou calorias.
- Usar conhecimento genérico do produto ou de marcas para preencher a tabela.
- Dar 🟢 Verde, 🟡 Amarelo ou 🔴 Vermelho sem dados legíveis na foto.

**Resposta obrigatória quando não der para ler (substitui a classificação):**

## Preciso de uma foto melhor
Não consegui ler o rótulo com segurança nesta imagem.

**O que enviar:** foto de frente, com boa luz, sem reflexo, mostrando a **tabela nutricional** (porção + valores). Ingredientes ajudam, mas não são obrigatórios se a tabela estiver legível.

**Dica:** aproxime o celular até os números ficarem nítidos; evite sombra ou flash direto no plástico.

Assim que você mandar outra foto, eu classifico o consumo para você.`;

export const LABEL_PORTION_RULES = `## Leitura da tabela: porção vs 100 g (OBRIGATÓRIO)

Rótulos brasileiros trazem **duas colunas**: valores **por 100 g** (ou 100 ml) e valores **por porção de referência** (ex.: "Porção: 60 g (1 unidade)").

**Regra de ouro para classificar o consumo:**
- Use SEMPRE a coluna da **porção de referência** (a que a pessoa realmente come de uma vez), NÃO a coluna de 100 g.
- A porção costuma estar no topo da tabela: "Porção: X g", "1 unidade", "1 fatia", "2 bolachas", etc.
- No **Por quê**, cite explicitamente a porção usada: "na porção de 60 g (1 unidade): 6 g proteína, 10 g carboidrato, 0,9 g gordura".

**Quando usar cada coluna:**
| Coluna | Quando usar |
|--------|-------------|
| **Porção de referência** | Classificação do semáforo, regra proteica, sódio/açúcar do consumo real, sugestão de uso no dia a dia |
| **100 g** | Só se a porção não estiver legível, ou para contextualizar comparação ("equivale a 10 g proteína/100 g, ainda baixo para substituto de carne") |

**Proibido:**
- Misturar colunas (ex.: proteína da coluna 100 g com carboidrato da porção).
- Dizer "na porção de 60 g: 10 g de proteína" quando 10 g é da coluna **100 g** e a porção tem **6 g** (erro grave).
- Dizer "na porção de 60 g: 20 g de carboidrato" quando o valor da porção é **10 g** ou **17 g** na coluna errada.
- Classificar usando só 100 g quando a porção estiver visível no rótulo.
- Ignorar o tamanho da porção (60 g ≠ 100 g).

**Exemplo ERRADO vs CERTO (hambúrguer vegetal):**
| | ERRADO | CERTO |
|---|--------|-------|
| Porção | "60 g tem 10 g proteína" | "60 g (1 unidade) tem **6 g** proteína" |
| Carboidrato | "20 g carboidrato na porção" (inventado ou coluna errada) | "**10 g** carboidrato na porção" (coluna da porção) |
| 100 g | Usar 10 g P / 17 g C na classificação | Só mencionar 100 g como referência opcional, nunca no Por quê como se fosse a porção |

Como fonte de proteína: 6 g proteína < 10 g carboidrato na porção → **proteína baixa**, mínimo 🟡 Amarelo.`;

export const LABEL_PROTEIN_SOURCE_CRITERIA = `## Regra especial: produtos como FONTE DE PROTEÍNA (OBRIGATÓRIO em toda foto de rótulo)

Antes do veredicto final, identifique se a paciente usaria este produto principalmente como **fonte de proteína** na dieta (substituição de carne, frango, peixe, ovo ou proteína do lanche/jantar no plano).

**Considere produto proteico quando** o nome, categoria, embalagem ou uso típico indicar, por exemplo:
- Hambúrguer (vegetal ou animal), nugget, almôndega, kafta, falafel, seitán, tofu temperado
- Whey, shake ou barra de proteína, iogurte proteico, bebida láctea "proteica"
- Peito de frango, carne bovina/suína, peixe, atum/sardinha enlatados, ovo
- Queijo cottage, ricota, iogurte grego como proteína da refeição
- Burgers de grão-de-bico, lentilha ou leguminosa vendidos como "proteína vegetal" ou substituto de carne

**Critério de adequação proteica (na porção de referência do rótulo, NÃO na coluna 100 g):**
- Proteínas (g) devem ser **MAIORES** que carboidratos (g) **E** **MAIORES** que gorduras totais (g).
- Exemplo inadequado: 9 g proteína, 11 g carboidrato, 7 g gordura na porção → **não serve bem como proteína principal**.
- Exemplo inadequado (porção 60 g): **6 g** proteína, **10 g** carboidrato, **0,9 g** gordura → carboidrato supera a proteína; **não substitui** carne no plano.

**O que é pouca proteína (seja explícita com a paciente):**
- Para produto usado como fonte de proteína: **menos de 12 g de proteína na porção de referência** costuma ser insuficiente (ex.: 6 g, 8 g, 9 g em 50–80 g).
- Referência: peito de frango cozido ~25–30 g/100 g; bom substituto proteico costuma ter **≥ 15 g/100 g** ou proteína dominante na porção.
- Se proteína for a **menor** das três macros (P, C, G) na porção, diga que **não substitui bem** carne/frango/peixe/ovo no plano.

**Proibido na linguagem (quando produto é fonte de proteína):**
- NUNCA use: "boa quantidade de proteína", "rica em proteína", "bom aporte proteico", "boa fonte de proteína" se proteína ≤ carboidratos, proteína ≤ gorduras ou proteína < 12 g na porção.
- Use em vez disso: "proteína baixa para o papel de fonte proteica", "carboidrato/gordura superam a proteína", "não cobre bem a proteína da refeição".

**Impacto no semáforo (somado a todos os critérios anteriores):**
- Se o produto seria usado como fonte de proteína mas **não passa** no critério (proteína ≤ carboidratos OU proteína ≤ gorduras): **nunca** classifique 🟢 Verde. Use no mínimo 🟡 Amarelo.
- Se também houver ultraprocessamento, açúcar relevante, sódio alto ou outros problemas dos critérios gerais → tendência a 🔴 Vermelho.
- No **Por quê**, compare explicitamente proteína × carboidrato × gordura por porção quando os números forem legíveis.
- Na **Sugestão**, oriente: combinar com outra fonte proteica, trocar por opção com mais proteína, ou usar como acompanhamento (não como proteína principal da refeição).
- Se classificar 🟡 ou 🔴 por falha proteica, na **Alternativa melhor** (quando couber) indique produto equivalente com proteína maior que carboidrato e gordura.

**Exceções (não aplicar esta regra):**
- Produtos que não são fonte proteica principal: pão, biscoito, granola, suco, azeite, fruta, chocolate, snacks, castanhas como gordura boa.
- Leguminosas in natura no prato (feijão, lentilha cozida) podem ter mais carboidrato; a regra vale para **produtos industrializados comercializados como substituto proteico**.`;

/** Usado quando a tabela já foi extraída da foto (pipeline estruturado). */
export const LABEL_EXTRACTED_DATA_RULES = `## Tabela já lida da foto (REGRA ABSOLUTA)

Os números em "Dados lidos do rótulo" foram extraídos com sucesso da imagem enviada pelo paciente.
- **PROIBIDO** responder "## Preciso de uma foto melhor" ou pedir nova foto.
- **OBRIGATÓRIO** responder com "## Classificação do consumo" e o semáforo.
- Lista de ingredientes **não é obrigatória** — classifique pela tabela nutricional e pelo tipo de produto (productHint).
- Se não houver ingredientes na foto, use o perfil de macros e o contexto do produto (ex.: margarina, iogurte, biscoito).`;

export const LABEL_SEMAPHORE_CRITERIA_EXTRACTED = `## Sistema de semáforo (OBRIGATÓRIO)

Classifique o consumo em UMA cor:

### 🟢 Verde — Liberado
- Produtos minimamente processados (NOVA 1–2) com poucos ingredientes reconhecíveis.
- Tabela nutricional favorável na **porção de referência**: baixo açúcar adicionado, sódio moderado, sem gordura trans.

### 🟡 Amarelo — Consumir com moderação
- Produtos processados (NOVA 3) ou tabela com algum nutriente de atenção (sódio, gordura saturada, açúcar).
- Margarinas, cremes, embutidos leves, snacks — consumo ocasional.

### 🔴 Vermelho — Evitar ou consumir raramente
- Ultraprocessados (NOVA 4) com muitos aditivos industrializados.
- Tabela desfavorável: açúcar + sódio + gordura saturada em excesso na porção.
- Gordura trans artificial (qualquer presença).

${LABEL_PROTEIN_SOURCE_CRITERIA}

${LABEL_PORTION_RULES}

## Como decidir
1. Use a **porção de referência** e os números em "Dados lidos do rótulo".
2. Se houver ingredientes na foto, avalie NOVA; se não, use productHint e macros.
3. Escolha UMA cor e justifique citando a porção e os números lidos.

## Formato obrigatório
## Classificação do consumo
(emoji + classificação + **Por quê** + **Sugestão**; se 🔴, inclua **Alternativa melhor**)

Regras finais:
- NUNCA peça nova foto neste fluxo.
- NUNCA invente números além dos fornecidos em "Dados lidos do rótulo".`;

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
- **Produto usado como fonte de proteína, mas com proteína ≤ carboidratos ou proteína ≤ gorduras na porção** (ex.: hambúrguer vegetal com mais carboidrato que proteína).
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
- **Produto comercializado como proteína/substituto de carne com perfil inadequado** (proteína não supera carboidrato e gordura) somado a lista industrializada ou sódio elevado.

${LABEL_PROTEIN_SOURCE_CRITERIA}

${LABEL_PORTION_RULES}

${LABEL_ILLEGIBLE_PHOTO_RULES}

## Como decidir (ordem de análise)
0. A foto permite ler tabela e ingredientes com certeza? Se **não**, responda só com ## Preciso de uma foto melhor (sem semáforo).
1. Localize a **porção de referência** no rótulo (ex.: "Porção: 60 g (1 unidade)") e use a coluna dessa porção para todos os números da classificação.
2. Leia a lista de ingredientes (primeiros 5): reconhecíveis? aditivos? ordem do açúcar?
3. Classifique o grau de processamento (NOVA 1 a 4) com base nos ingredientes.
4. Avalie a tabela **na porção de referência**: calorias, açúcares, gordura saturada/trans, sódio, fibras, proteínas, carboidratos e gorduras totais.
5. Identifique se o produto seria usado como **fonte de proteína**; se sim, aplique a regra proteica na **porção** (proteína > carboidrato E proteína > gordura).
6. Aplique contexto especial (castanhas naturais, minimamente processados ricos em gordura boa).
7. Escolha UMA cor do semáforo e justifique em 2–4 frases objetivas, citando a porção usada.

## Formato obrigatório da resposta (ÚNICA seção visível ao paciente)
Responda SOMENTE com esta seção. Não crie outras seções (sem Produto, Ingredientes, Nutrientes, etc.):

## Classificação do consumo
🟢 Verde — Liberado
(ou 🟡 Amarelo — Consumir com moderação / 🔴 Vermelho — Evitar ou consumir raramente)

**Por quê:** [justificativa clara; cite a porção usada, ex.: "na porção de 60 g (1 unidade)" + números dessa coluna]
**Sugestão:** [como usar no dia a dia: frequência, porção ou cuidado se amarelo/vermelho]

Se a classificação for 🔴 Vermelho, inclua OBRIGATORIAMENTE também:
**Alternativa melhor:** 🟢 ou 🟡 [opção de consumo ou produto equivalente na mesma categoria alimentar, mais saudável e prática no dia a dia. Ex.: margarina com gordura hidrogenada → manteiga ou azeite; biscoito recheado → biscoito integral simples ou fruta; refrigerante → água com limão ou chá sem açúcar]

Regras finais:
- NUNCA use o título "Semáforo" na resposta. Use apenas "Classificação do consumo".
- NUNCA inclua seções ## Produto, ## Ingredientes, ## Nutrientes de atenção ou listas de ingredientes.
- Em 🔴 Vermelho, a **Alternativa melhor** é obrigatória e deve ser verde ou amarela, do mesmo tipo de alimento/uso.
- **Leitura fiel da tabela:** use SOMENTE valores legíveis na foto, da coluna da **porção de referência**. Se a porção é 60 g e o rótulo diz 6 g de proteína, escreva 6 g (nunca 10 g da coluna 100 g).
- Ao citar proteína, carboidrato ou gordura no **Por quê**, o número deve corresponder exatamente à porção mostrada no rótulo.
- Se a leitura não for confiável, **não classifique**: use o formato ## Preciso de uma foto melhor (veja regra acima).
- NUNCA invente números. NUNCA classifique com números estimados.
- Não prescreva dieta personalizada; lembre que a nutricionista do Clube Florescer orienta o plano individual.`;

/** Estrutura markdown esperada na resposta de análise de rótulo. */
export const LABEL_ANALYSIS_SECTIONS = `Responda em markdown APENAS com UMA destas estruturas:

**A) Foto legível — classificação:**
## Classificação do consumo
(Obrigatório: emoji + classificação + Por quê + Sugestão)
(Se 🔴 Vermelho: inclua também **Alternativa melhor** com opção 🟢 ou 🟡 equivalente na mesma categoria)

**B) Foto ilegível ou números duvidosos — pedir nova foto:**
## Preciso de uma foto melhor
(Texto explicando que não leu com segurança + o que enviar + dica de luz/foco)
(Sem emoji de semáforo, sem Por quê com números inventados)

Proibido na resposta ao paciente:
- Título "Semáforo"
- Seções ## Produto, ## Ingredientes ou listagem de ingredientes
- Seções extras de tabela nutricional detalhada
- Valores nutricionais que não estejam claramente visíveis na foto`;

export function buildLabelChatSemaphoreGuide(): string {
  return `${LABEL_SEMAPHORE_CRITERIA}

Quando o paciente enviar só texto (sem foto), explique que precisa da foto do rótulo e peça imagem nítida antes de classificar.
Se descrever um produto conhecido, diga que a classificação definitiva depende do rótulo real e peça a foto; não invente valores da tabela.`;
}
