export type DiaryFeedAuthor = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  role?: string | null;
};

export type DiaryFeedComment = {
  id: string;
  content: string;
  createdAt: string;
  author?: DiaryFeedAuthor;
};

export type DiaryFeedLiker = DiaryFeedAuthor;

export type DiaryFeedEntry = {
  id: string;
  mealLabel?: string | null;
  mealType?: string;
  imageUrl: string;
  createdAt: string;
  caloriesKcal?: number;
  likesCount: number;
  likedByNutri?: boolean;
  commentsCount: number;
  commentsPreview?: DiaryFeedComment[];
};

export type DiaryFeedPage = {
  entries: DiaryFeedEntry[];
  hasMore: boolean;
  nextSkip: number | null;
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner: 'Jantar',
  supper: 'Ceia',
  other: 'Refeição',
};

export function diaryMealLabel(entry: Pick<DiaryFeedEntry, 'mealLabel' | 'mealType'>) {
  return entry.mealLabel || MEAL_LABELS[entry.mealType || ''] || 'Refeição';
}

export function diaryCommentAuthorLabel(author?: DiaryFeedAuthor | null) {
  const role = String(author?.role || '').toUpperCase();
  if (role === 'NUTRICIONISTA') return 'Sua nutri';
  return author?.name?.trim() || 'Nutri';
}

export function formatDiaryRelative(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function formatDiaryCommentWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startToday.getTime() - startDay.getTime()) / 86400000);
  if (diffDays === 0) return `Hoje ${time}`;
  if (diffDays === 1) return `Ontem ${time}`;
  if (diffDays >= 2 && diffDays < 7) {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${time}`;
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ` ${time}`;
}

export function shortDiaryName(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Você';
  return parts.slice(0, 2).join(' ');
}
