export const BELLA_DAILY_TIPS = [
  'Proteínas no café da manhã ajudam a controlar a fome ao longo do dia.',
  'Um copo de água ao acordar ajuda o metabolismo a funcionar melhor.',
  'Vegetais coloridos no almoço trazem mais vitaminas e saciedade.',
  'Dormir bem melhora a resposta do corpo à alimentação do dia seguinte.',
  'Frutas inteiras têm mais fibra do que o suco — prefira comer a fruta.',
  'Planejar o lanche da tarde evita escolhas impulsivas no fim do dia.',
  'Comer devagar aumenta a saciedade e melhora a digestão.',
  'Gorduras boas (abacate, castanhas, azeite) ajudam na saciedade.',
  'Refeições regulares mantêm a energia mais estável ao longo do dia.',
  'Leguminosas (feijão, lentilha, grão-de-bico) são ótimas fontes de proteína e fibra.',
];

export function getBellaDailyTip(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return BELLA_DAILY_TIPS[dayOfYear % BELLA_DAILY_TIPS.length];
}
