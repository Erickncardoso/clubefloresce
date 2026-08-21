import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import CheckinTypeformFlow, { type CheckinFlowStep } from '@/components/checkin/CheckinTypeformFlow';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import {
  buildAnswerHighlights,
  formatCheckinPeriod,
  scoreFromTemplateAnswers,
} from '@/lib/checkin-answers';
import { useWeeklyCheckIn } from '@/hooks/useWeeklyCheckIn';
import { usePatientApi } from '@/hooks/usePatientApi';
import { onCheckinCompleted } from '@/notifications/sync-engine';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Template = {
  id: string;
  title: string;
  description?: string;
  frequency?: string;
  completedThisPeriod?: boolean;
  steps?: CheckinFlowStep[];
};

type HistoryItem = {
  id: string;
  periodKey?: string;
  createdAt?: string;
  updatedAt?: string;
  template?: {
    title?: string;
    frequency?: string;
    steps?: Array<{ id: string; label?: string; question?: string; type?: string }>;
  };
  answers?: Record<string, unknown>;
};

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'month', label: 'Este mês' },
  { id: 'quarter', label: '3 meses' },
];

function frequencyLabel(freq?: string) {
  if (freq === 'daily') return 'Diário';
  if (freq === 'monthly') return 'Mensal';
  return 'Semanal';
}

function scoreOf(item: HistoryItem) {
  return scoreFromTemplateAnswers(item.answers);
}

function statusMeta(score: number | null) {
  if (score == null) return { label: 'Respondido', tone: 'muted' as const };
  if (score >= 80) return { label: 'Muito bom', tone: 'ok' as const };
  if (score >= 50) return { label: 'Bom', tone: 'warn' as const };
  return { label: 'A melhorar', tone: 'muted' as const };
}

function barColor(score: number) {
  if (score >= 80) return colors.primary;
  if (score >= 50) return '#d4a574';
  return '#c9cdc6';
}

export default function CheckInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ template?: string }>();
  const { request } = usePatientApi();
  const {
    templates,
    loading,
    waitMessage,
    canOpenTemplate,
    loadCheckInAccess,
  } = useWeeklyCheckIn();

  const [selected, setSelected] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await request<{ responses?: HistoryItem[] }>('/checkin/me/responses');
      setHistory(data.responses || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      void loadCheckInAccess();
      void loadHistory();
    }, [loadCheckInAccess, loadHistory]),
  );

  useEffect(() => {
    const templateId = typeof params.template === 'string' ? params.template : '';
    if (!templateId || !templates.length || selected) return;
    const tpl = templates.find((item) => item.id === templateId);
    if (tpl && canOpenTemplate(tpl)) {
      setSelected(tpl as Template);
      setSubmitted(false);
      setError('');
    }
  }, [canOpenTemplate, params.template, selected, templates]);

  const openTemplates = useMemo(
    () => templates.filter((tpl) => canOpenTemplate(tpl)),
    [canOpenTemplate, templates],
  );

  const chartItems = useMemo(
    () =>
      [...history]
        .slice(0, 8)
        .reverse()
        .map((item) => ({
          ...item,
          score: scoreOf(item) ?? 0,
        })),
    [history],
  );

  const averageScore = useMemo(() => {
    const scored = history
      .map((item) => scoreOf(item))
      .filter((value): value is number => value != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length);
  }, [history]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter((item) => {
      const d = new Date(item.updatedAt || item.createdAt || '');
      if (Number.isNaN(d.getTime())) return activeFilter === 'all';
      if (activeFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (activeFilter === 'quarter') {
        return now.getTime() - d.getTime() <= 90 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [activeFilter, history]);

  function startTemplate(tpl: Template) {
    setSelected(tpl);
    setSubmitted(false);
    setError('');
  }

  async function submitAnswers(answers: Record<string, unknown>) {
    if (!selected || submitted) return;
    setSaving(true);
    setError('');
    try {
      await request('/checkin/responses', {
        method: 'POST',
        body: JSON.stringify({
          templateId: selected.id,
          answers,
        }),
      });
      setSubmitted(true);
      await onCheckinCompleted();
      setTimeout(() => router.replace('/check-in/concluido' as never), 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !templates.length) {
    return (
      <PatientShell>
        <PatientHeader />
        <LoadingScreen />
      </PatientShell>
    );
  }

  if (selected) {
    return (
      <PatientShell>
        <View style={{ flex: 1 }}>
          <CheckinTypeformFlow
            steps={selected.steps || []}
            saving={saving}
            submitted={submitted}
            error={error}
            showHistoryLink={history.length > 0}
            onHistoryPress={() => setSelected(null)}
            onSubmit={submitAnswers}
          />
        </View>
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <PatientHeader />
      <PatientScrollView contentContainerStyle={styles.list}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Acompanhamento</Text>
          <Text style={styles.heroTitle}>Check-in semanal</Text>
          <Text style={styles.heroDesc}>
            Uma pausa estratégica para olhar como foi a semana — hábitos, energia e o que precisa de atenção.
          </Text>
        </View>

        {openTemplates.length ? (
          <View style={styles.ctaCard}>
            <View style={styles.ctaCopy}>
              <Text style={styles.ctaBadge}>Liberado</Text>
              <Text style={styles.ctaTitle}>
                {openTemplates.length === 1
                  ? openTemplates[0].title
                  : `${openTemplates.length} check-ins disponíveis`}
              </Text>
              <Text style={styles.ctaDesc}>
                {openTemplates.length === 1
                  ? openTemplates[0].description || 'Responda agora e registre como foi sua semana.'
                  : 'Escolha um check-in abaixo e registre como foi sua semana.'}
              </Text>
            </View>
            {openTemplates.length === 1 ? (
              <CfButton
                label="Responder agora"
                onPress={() => startTemplate(openTemplates[0] as Template)}
              />
            ) : (
              openTemplates.map((tpl) => (
                <Pressable
                  key={tpl.id}
                  style={styles.openRow}
                  onPress={() => startTemplate(tpl as Template)}
                >
                  <View style={styles.openRowCopy}>
                    <Text style={styles.openRowTitle}>{tpl.title}</Text>
                    <Text style={styles.openRowMeta}>{frequencyLabel(tpl.frequency)}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.primaryDark} />
                </Pressable>
              ))
            )}
          </View>
        ) : waitMessage ? (
          <View style={styles.waitCard}>
            <Text style={styles.waitTitle}>Ainda não está aberto</Text>
            <Text style={styles.waitMessage}>{waitMessage}</Text>
          </View>
        ) : !templates.length ? (
          <View style={styles.waitCard}>
            <Text style={styles.waitTitle}>Nada por aqui</Text>
            <Text style={styles.waitMessage}>Nenhum check-in disponível no momento.</Text>
          </View>
        ) : (
          templates.map((tpl) => (
            <View
              key={tpl.id}
              style={[styles.infoCard, tpl.completedThisPeriod && styles.infoCardDone]}
            >
              <Text style={styles.infoTitle}>{tpl.title}</Text>
              {tpl.description ? <Text style={styles.infoDesc}>{tpl.description}</Text> : null}
              <View style={styles.infoMetaRow}>
                <Text style={styles.infoMeta}>{frequencyLabel(tpl.frequency)}</Text>
                {tpl.completedThisPeriod ? (
                  <Text style={styles.doneBadge}>Respondido</Text>
                ) : null}
              </View>
            </View>
          ))
        )}

        {history.length > 0 || historyLoading ? (
          <>
            <PatientScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              {FILTERS.map((chip) => {
                const active = activeFilter === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setActiveFilter(chip.id)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </PatientScrollView>

            {chartItems.length ? (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View>
                    <Text style={styles.chartTitle}>Progresso</Text>
                    <Text style={styles.chartSubtitle}>
                      {chartItems.length} semana{chartItems.length === 1 ? '' : 's'} recente
                      {chartItems.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  {averageScore != null ? (
                    <View style={styles.avgBadge}>
                      <Text style={styles.avgValue}>{averageScore}%</Text>
                      <Text style={styles.avgLabel}>média</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.bars}>
                  {chartItems.map((item, index) => (
                    <View key={item.id} style={styles.barWrap}>
                      <Text style={styles.barPct}>{item.score || '—'}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${Math.max(10, item.score)}%`,
                              backgroundColor: barColor(item.score),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>S{chartItems.length - index}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Histórico</Text>
              <Text style={styles.listCount}>
                {filteredHistory.length} registro{filteredHistory.length === 1 ? '' : 's'}
              </Text>
            </View>

            {historyLoading ? (
              <Text style={styles.emptyText}>Carregando respostas...</Text>
            ) : filteredHistory.length ? (
              <View style={styles.cards}>
                {filteredHistory.map((item) => {
                  const score = scoreOf(item);
                  const status = statusMeta(score);
                  const absoluteIndex = history.findIndex((entry) => entry.id === item.id);
                  const weekNumber = absoluteIndex >= 0 ? history.length - absoluteIndex : 0;
                  const highlights = buildAnswerHighlights(item.template?.steps, item.answers);

                  return (
                    <Pressable
                      key={item.id}
                      style={styles.card}
                      onPress={() => router.push('/check-in/resumo' as never)}
                    >
                      <View style={styles.cardTop}>
                        <View style={styles.cardCopy}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.template?.title || 'Check-in'}
                            {weekNumber > 0 ? ` #${weekNumber}` : ''}
                          </Text>
                          <Text style={styles.cardMeta}>
                            {formatCheckinPeriod(item.periodKey, item.template?.frequency)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            status.tone === 'ok' && styles.statusOk,
                            status.tone === 'warn' && styles.statusWarn,
                            status.tone === 'muted' && styles.statusMuted,
                          ]}
                        >
                          {score != null ? (
                            <Text
                              style={[
                                styles.statusScore,
                                status.tone === 'ok' && styles.statusTextOk,
                                status.tone === 'warn' && styles.statusTextWarn,
                                status.tone === 'muted' && styles.statusTextMuted,
                              ]}
                            >
                              {score}%
                            </Text>
                          ) : null}
                          <Text
                            style={[
                              styles.statusLabel,
                              status.tone === 'ok' && styles.statusTextOk,
                              status.tone === 'warn' && styles.statusTextWarn,
                              status.tone === 'muted' && styles.statusTextMuted,
                            ]}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>

                      {highlights.length ? (
                        <View style={styles.answerChips}>
                          {highlights.map((chip) => (
                            <View key={chip.id} style={styles.answerChip}>
                              <Text style={styles.answerChipLabel}>{chip.label}</Text>
                              <Text style={styles.answerChipValue} numberOfLines={1}>
                                {chip.value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nenhum registro neste período</Text>
                <Text style={styles.emptyText}>
                  Troque o filtro ou volte depois de responder um check-in.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sem histórico ainda</Text>
            <Text style={styles.emptyText}>
              Suas respostas aparecem aqui depois do primeiro check-in.
            </Text>
          </View>
        )}
      </PatientScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  hero: {
    gap: spacing[2],
  },
  heroEyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
  },
  heroDesc: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  ctaCard: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    padding: spacing[4],
    gap: spacing[3],
  },
  ctaCopy: {
    gap: spacing[1],
  },
  ctaBadge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.primaryDark,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: 4,
  },
  ctaTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  ctaDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: '#fff',
    borderRadius: radii.control,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  openRowCopy: {
    flex: 1,
    gap: 2,
  },
  openRowTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  openRowMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
  waitCard: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fafafa',
    padding: spacing[4],
    gap: spacing[2],
  },
  waitTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  waitMessage: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  infoCard: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[2],
  },
  infoCardDone: {
    opacity: 0.85,
  },
  infoTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  infoDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  infoMeta: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  doneBadge: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  filterChips: {
    gap: spacing[2],
    paddingRight: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.primaryDark,
  },
  chartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[4],
    backgroundColor: colors.surface,
    gap: spacing[4],
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  chartTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  chartSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  avgBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
  },
  avgValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.primaryDark,
  },
  avgLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.primaryDark,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    height: 120,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    gap: 4,
  },
  barPct: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.textMuted,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    minHeight: 64,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    minHeight: 8,
  },
  barLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  listCount: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  cards: {
    gap: spacing[3],
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  cardMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  statusBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.control,
    gap: 1,
  },
  statusOk: {
    backgroundColor: colors.primarySoft,
  },
  statusWarn: {
    backgroundColor: '#f8efe3',
  },
  statusMuted: {
    backgroundColor: '#f3f3f1',
  },
  statusScore: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  statusLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  statusTextOk: {
    color: colors.primaryDark,
  },
  statusTextWarn: {
    color: '#a16207',
  },
  statusTextMuted: {
    color: '#6b7280',
  },
  answerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  answerChip: {
    maxWidth: '48%',
    borderRadius: radii.control,
    backgroundColor: '#f7f7f5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  answerChipLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  answerChipValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  emptyCard: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fafafa',
    padding: spacing[5],
    gap: spacing[2],
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
