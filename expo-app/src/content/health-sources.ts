export type HealthSource = {
  label: string;
  description: string;
  url: string;
};

/** Fontes das orientações nutricionais/de saúde exibidas no app (Guideline 1.4.1 Apple). */
export const HEALTH_SOURCES: HealthSource[] = [
  {
    label: 'Guia Alimentar para a População Brasileira',
    description: 'Ministério da Saúde — diretrizes oficiais de alimentação saudável no Brasil.',
    url: 'https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_populacao_brasileira_2ed.pdf',
  },
  {
    label: 'Healthy diet',
    description: 'Organização Mundial da Saúde (OMS) — recomendações internacionais de nutrição.',
    url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
  },
  {
    label: 'Conselho Federal de Nutricionistas (CFN)',
    description: 'Órgão regulador da profissão de nutricionista no Brasil.',
    url: 'https://www.cfn.org.br/',
  },
  {
    label: 'Dietary Reference Intakes',
    description: 'National Institutes of Health (NIH) — referências de ingestão de nutrientes.',
    url: 'https://ods.od.nih.gov/HealthInformation/dietaryreferenceintakes.aspx',
  },
];

export const HEALTH_SOURCES_NOTE =
  'Os planos alimentares do Clube Florescer são prescritos individualmente pela nutricionista responsável, '
  + 'com base nessas diretrizes e na avaliação de cada paciente. As sugestões da Bella (assistente de IA) seguem '
  + 'as mesmas referências e não substituem a orientação profissional.';
