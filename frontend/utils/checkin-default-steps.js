export const CHECKIN_DEFAULT_STEPS = [
  {
    id: 'food',
    type: 'food',
    label: 'Alimentação',
    question: 'Como foi sua alimentação hoje?',
    hint: 'Toque no rosto que mais combina com o seu dia.',
  },
  {
    id: 'water',
    type: 'water',
    label: 'Água',
    question: 'Quantos copos de água você bebeu?',
    hint: 'Conte apenas copos padrão, de cerca de 200 ml.',
  },
  {
    id: 'exercise',
    type: 'exercise',
    label: 'Exercício',
    question: 'Você praticou atividade física hoje?',
    hint: 'Caminhada, musculação, yoga ou qualquer movimento conta.',
  },
  {
    id: 'sleep',
    type: 'scale',
    label: 'Sono',
    question: 'Como você dormiu?',
    hint: 'Toque nas estrelas de 1 (péssimo) a 5 (excelente).',
    min: 1,
    max: 5,
  },
]
