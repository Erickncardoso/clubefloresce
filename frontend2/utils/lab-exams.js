export const EXAMES_LIMIT = 30

export const BIOMARKER_CATEGORIES = [
  { id: 'glycemic', label: 'Metabolismo glicêmico' },
  { id: 'lipid', label: 'Perfil lipídico' },
  { id: 'thyroid', label: 'Tireoide' },
  { id: 'hematology', label: 'Hematologia e ferro' },
  { id: 'renal', label: 'Função renal' },
  { id: 'hepatic', label: 'Função hepática' },
  { id: 'vitamins', label: 'Vitaminas e minerais' },
  { id: 'inflammation', label: 'Inflamação' },
]

/** Catálogo de biomarcadores com faixas padrão e insights clínicos. */
export const LAB_BIOMARKER_CATALOG = [
  {
    id: 'glucose_fasting',
    name: 'Glicemia de jejum',
    unit: 'mg/dL',
    category: 'glycemic',
    defaultRefMin: 70,
    defaultRefMax: 99,
    insightShort: 'Reflete a glicemia basal e sensibilidade à insulina.',
    insightExtended:
      'Valores persistentemente elevados sugerem resistência insulínica ou diabetes (MS/SBD). '
      + 'Valores baixos podem indicar hipoglicemia reativa ou jejum prolongado. '
      + 'Contextualize com HbA1c, insulina e padrão alimentar (DRI/OMS).',
    references: ['MS', 'SBD', 'DRI', 'OMS'],
  },
  {
    id: 'hba1c',
    name: 'HbA1c',
    unit: '%',
    category: 'glycemic',
    defaultRefMin: 4,
    defaultRefMax: 5.6,
    insightShort: 'Média glicêmica dos últimos ~3 meses.',
    insightExtended:
      '≥5,7% indica pré-diabetes; ≥6,5% confirma diabetes (SBD/ADA). '
      + 'Queda progressiva reflete adesão nutricional e controle glicêmico. '
      + 'Metas individualizadas conforme idade e comorbidades.',
    references: ['SBD', 'ADA', 'OMS'],
  },
  {
    id: 'insulin_fasting',
    name: 'Insulina de jejum',
    unit: 'µUI/mL',
    category: 'glycemic',
    defaultRefMin: 2,
    defaultRefMax: 12,
    insightShort: 'Marcador de resistência insulínica quando elevada.',
    insightExtended:
      'Insulina alta com glicemia normal sugere hiperinsulinemia compensatória. '
      + 'Útil para ajustar distribuição de carboidratos e estratégias de perda de peso.',
    references: ['Endocrine Society', 'DRI'],
  },
  {
    id: 'total_cholesterol',
    name: 'Colesterol total',
    unit: 'mg/dL',
    category: 'lipid',
    defaultRefMin: null,
    defaultRefMax: 190,
    insightShort: 'Visão global do metabolismo lipídico.',
    insightExtended:
      'Interpretar junto com LDL, HDL e triglicerídeos (SBC). '
      + 'Dieta rica em gorduras saturadas, ultraprocessados e baixa fibra tende a elevar CT.',
    references: ['SBC', 'DRI'],
  },
  {
    id: 'hdl',
    name: 'HDL-colesterol',
    unit: 'mg/dL',
    category: 'lipid',
    defaultRefMin: 40,
    defaultRefMax: null,
    insightShort: 'Quanto maior, em geral, melhor proteção cardiovascular.',
    insightExtended:
      'HDL baixo associa-se a sedentarismo, excesso de carboidratos refinados e tabagismo. '
      + 'Atividade física e gorduras monoinsaturadas podem elevar HDL (SBC).',
    references: ['SBC', 'OMS'],
  },
  {
    id: 'ldl',
    name: 'LDL-colesterol',
    unit: 'mg/dL',
    category: 'lipid',
    defaultRefMin: null,
    defaultRefMax: 130,
    insightShort: 'Principal alvo lipídico na prevenção cardiovascular.',
    insightExtended:
      'Metas variam conforme risco cardiovascular (SBC). '
      + 'Fibra solúvel, Ômega-3, redução de gordura trans/saturada e perda de peso ajudam a reduzir LDL.',
    references: ['SBC', 'DRI'],
  },
  {
    id: 'triglycerides',
    name: 'Triglicerídeos',
    unit: 'mg/dL',
    category: 'lipid',
    defaultRefMin: null,
    defaultRefMax: 150,
    insightShort: 'Sensível à ingestão de açúcares, álcool e excesso calórico.',
    insightExtended:
      'TG elevados frequentemente respondem a redução de carboidratos simples, álcool e perda de peso. '
      + 'Valores muito altos (>500) exigem atenção clínica imediata (SBC).',
    references: ['SBC', 'OMS'],
  },
  {
    id: 'tsh',
    name: 'TSH',
    unit: 'µUI/mL',
    category: 'thyroid',
    defaultRefMin: 0.4,
    defaultRefMax: 4.0,
    insightShort: 'Screening de disfunção tireoidiana.',
    insightExtended:
      'TSH alto sugere hipotireoidismo; TSH baixo, hipertireoidismo (SBEM). '
      + 'Alterações impactam metabolismo basal, peso, lipídios e termogênese.',
    references: ['SBEM', 'OMS'],
  },
  {
    id: 'free_t4',
    name: 'T4 livre',
    unit: 'ng/dL',
    category: 'thyroid',
    defaultRefMin: 0.8,
    defaultRefMax: 1.8,
    insightShort: 'Confirma função tireoidiana junto ao TSH.',
    insightExtended:
      'Interpretar sempre com TSH. Hipotireoidismo subclínico pode exigir acompanhamento nutricional para controle de peso e constipação.',
    references: ['SBEM'],
  },
  {
    id: 'hemoglobin',
    name: 'Hemoglobina',
    unit: 'g/dL',
    category: 'hematology',
    defaultRefMin: 12,
    defaultRefMax: 16,
    insightShort: 'Capacidade de transporte de oxigênio.',
    insightExtended:
      'Valores baixos sugerem anemia — investigar ferro, B12, folato e perdas (MS). '
      + 'Nutrição: ferro heme, vitamina C, evitar chá/café nas refeições ricas em ferro.',
    references: ['MS', 'DRI'],
  },
  {
    id: 'ferritin',
    name: 'Ferritina',
    unit: 'ng/mL',
    category: 'hematology',
    defaultRefMin: 15,
    defaultRefMax: 150,
    insightShort: 'Reservas de ferro; também marcador inflamatório.',
    insightExtended:
      'Ferritina baixa confirma depleção de ferro. Elevada pode ser inflamação, sobrecarga ou doença hepática. '
      + 'Contextualize com PCR-us e quadro clínico.',
    references: ['MS', 'DRI'],
  },
  {
    id: 'vitamin_b12',
    name: 'Vitamina B12',
    unit: 'pg/mL',
    category: 'hematology',
    defaultRefMin: 200,
    defaultRefMax: 900,
    insightShort: 'Essencial para eritropoiese e função neurológica.',
    insightExtended:
      'Deficiência comum em vegetarianos/veganos, idosos e uso de metformina. '
      + 'Suplementação e alimentos fortificados conforme DRI.',
    references: ['DRI', 'OMS'],
  },
  {
    id: 'creatinine',
    name: 'Creatinina',
    unit: 'mg/dL',
    category: 'renal',
    defaultRefMin: 0.6,
    defaultRefMax: 1.2,
    insightShort: 'Estimativa de função renal.',
    insightExtended:
      'Elevação pode refletir desidratação, massa muscular alta ou disfunção renal. '
      + 'Ajuste proteína e sódio conforme estágio da DRC (MS/SBN).',
    references: ['MS', 'SBN'],
  },
  {
    id: 'urea',
    name: 'Ureia',
    unit: 'mg/dL',
    category: 'renal',
    defaultRefMin: 15,
    defaultRefMax: 45,
    insightShort: 'Metabolismo proteico e função renal.',
    insightExtended:
      'Pode elevar com dieta hiperproteica, desidratação ou insuficiência renal. '
      + 'Interpretar com creatinina e ingestão proteica.',
    references: ['MS'],
  },
  {
    id: 'alt',
    name: 'ALT (TGP)',
    unit: 'U/L',
    category: 'hepatic',
    defaultRefMin: null,
    defaultRefMax: 40,
    insightShort: 'Enzima hepática — esteatose e inflamação.',
    insightExtended:
      'Elevação leve a moderada comum em esteatose metabólica (NAFLD). '
      + 'Perda de peso, redução de fructose/álcool e atividade física melhoram perfil hepático.',
    references: ['MS', 'AASLD'],
  },
  {
    id: 'ast',
    name: 'AST (TGO)',
    unit: 'U/L',
    category: 'hepatic',
    defaultRefMin: null,
    defaultRefMax: 40,
    insightShort: 'Enzima hepática e muscular.',
    insightExtended:
      'Elevação isolada pode ser muscular pós-treino. Relação AST/ALT ajuda na interpretação de esteatose.',
    references: ['MS', 'AASLD'],
  },
  {
    id: 'vitamin_d',
    name: 'Vitamina D (25-OH)',
    unit: 'ng/mL',
    category: 'vitamins',
    defaultRefMin: 30,
    defaultRefMax: 100,
    insightShort: 'Status de vitamina D e saúde óssea/metabólica.',
    insightExtended:
      'Deficiência (<20 ng/mL) é frequente e associa-se a osteopenia, fadiga e imunidade. '
      + 'Suplementação conforme DRI e exposição solar.',
    references: ['DRI', 'SBEM', 'OMS'],
  },
  {
    id: 'magnesium',
    name: 'Magnésio',
    unit: 'mg/dL',
    category: 'vitamins',
    defaultRefMin: 1.7,
    defaultRefMax: 2.4,
    insightShort: 'Cofator em metabolismo glicídico e muscular.',
    insightExtended:
      'Baixo magnésio associa-se a resistência insulínica, cãibras e hipertensão. '
      + 'Fontes: castanhas, sementes, folhas verdes escuras.',
    references: ['DRI', 'OMS'],
  },
  {
    id: 'zinc',
    name: 'Zinco',
    unit: 'µg/dL',
    category: 'vitamins',
    defaultRefMin: 70,
    defaultRefMax: 120,
    insightShort: 'Mineral envolvido em imunidade e paladar.',
    insightExtended:
      'Deficiência pode afetar apetite, cicatrização e tolerância alimentar. '
      + 'Carnes, ovos e leguminosas são boas fontes.',
    references: ['DRI'],
  },
  {
    id: 'crp_us',
    name: 'PCR-us',
    unit: 'mg/L',
    category: 'inflammation',
    defaultRefMin: null,
    defaultRefMax: 3,
    insightShort: 'Marcador de inflamação sistêmica de baixo grau.',
    insightExtended:
      'PCR elevada associa-se a risco cardiometabólico, obesidade e dieta inflamatória. '
      + 'Padrão mediterrâneo, Ômega-3 e perda de peso tendem a reduzir PCR.',
    references: ['OMS', 'SBC'],
  },
]

export function findBiomarkerCatalogEntry(markerId) {
  return LAB_BIOMARKER_CATALOG.find((item) => item.id === markerId) || null
}

export function biomarkerCategoryLabel(categoryId) {
  return BIOMARKER_CATEGORIES.find((item) => item.id === categoryId)?.label || 'Outros'
}

export function catalogOptionsForSelect() {
  return LAB_BIOMARKER_CATALOG.map((item) => ({
    value: item.id,
    label: `${item.name} (${item.unit})`,
    category: item.category,
  }))
}

export function createEmptyBiomarkerRow(markerId = '') {
  const catalog = markerId ? findBiomarkerCatalogEntry(markerId) : null
  return {
    id: crypto.randomUUID(),
    markerId: catalog?.id || markerId || '',
    name: catalog?.name || '',
    value: '',
    unit: catalog?.unit || '',
    refMin: catalog?.defaultRefMin ?? null,
    refMax: catalog?.defaultRefMax ?? null,
    category: catalog?.category || '',
  }
}

export function normalizeBiomarkerRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const markerId = String(raw.markerId || '').trim()
  const catalog = markerId ? findBiomarkerCatalogEntry(markerId) : null
  const name = String(raw.name || catalog?.name || '').trim()
  if (!name) return null
  const value = Number(raw.value)
  if (!Number.isFinite(value)) return null
  return {
    id: String(raw.id || '').trim() || crypto.randomUUID(),
    markerId: markerId || catalog?.id || '',
    name,
    value,
    unit: String(raw.unit || catalog?.unit || '').trim() || '—',
    refMin: raw.refMin != null && raw.refMin !== '' ? Number(raw.refMin) : (catalog?.defaultRefMin ?? null),
    refMax: raw.refMax != null && raw.refMax !== '' ? Number(raw.refMax) : (catalog?.defaultRefMax ?? null),
    category: String(raw.category || catalog?.category || '').trim() || 'other',
  }
}

export function normalizeExame(raw) {
  if (!raw || typeof raw !== 'object') return null
  const title = String(raw.title || '').trim() || 'Registro de exame'
  const collectedAt = String(raw.collectedAt || '').trim() || new Date().toISOString().slice(0, 10)
  const biomarkers = (Array.isArray(raw.biomarkers) ? raw.biomarkers : [])
    .map(normalizeBiomarkerRow)
    .filter(Boolean)
  const now = new Date().toISOString()
  return {
    id: String(raw.id || '').trim() || crypto.randomUUID(),
    title,
    collectedAt,
    labName: String(raw.labName || '').trim() || null,
    notes: String(raw.notes || '').trim() || null,
    status: raw.status === 'draft' ? 'draft' : 'completed',
    authorName: String(raw.authorName || '').trim() || null,
    biomarkers,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  }
}

export function examePreviewText(exame) {
  const count = exame?.biomarkers?.length || 0
  const lab = exame?.labName ? ` · ${exame.labName}` : ''
  if (!count) return `Sem biomarcadores${lab}`
  return `${count} biomarcador(es)${lab}`
}

export function exameStatusLabel(status) {
  return status === 'draft' ? 'Rascunho' : 'Registrado'
}

export function formatExameDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function sortExamesByDate(exames = []) {
  return [...exames].sort((a, b) => {
    const da = String(a.collectedAt || a.createdAt || '')
    const db = String(b.collectedAt || b.createdAt || '')
    return da.localeCompare(db)
  })
}
