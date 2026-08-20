import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { consumeOpenWaterSheetFromIsland } from '@/lib/water-live-activity';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { ChevronRight, Lightbulb, Sparkles } from 'lucide-react-native';
import CheckinFridayPrompt from '@/components/home/CheckinFridayPrompt';
import HomeCurrentMealCard from '@/components/home/HomeCurrentMealCard';
import HomeGoalQuickAddSheet from '@/components/home/HomeGoalQuickAddSheet';
import HomeGoalsGrid, { type HomeGoalMetric } from '@/components/home/HomeGoalsGrid';
import HomeNutritionPanel from '@/components/home/HomeNutritionPanel';
import HomeRecentMealUploads from '@/components/home/HomeRecentMealUploads';
import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';
import PatientAvatar from '@/components/ui/PatientAvatar';
import PatientHeader from '@/components/ui/PatientHeader';
import { useDietaDiarySync } from '@/hooks/useDietaDiarySync';
import { useDiaryDate } from '@/hooks/useDiaryDate';
import { usePatientPlanAccess } from '@/hooks/usePatientPlanAccess';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientDailyHeader } from '@/hooks/usePatientDailyHeader';
import { usePatientGoals } from '@/hooks/usePatientGoals';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { useWeeklyCheckInPrompt } from '@/hooks/useWeeklyCheckInPrompt';
import { getBellaDailyTip } from '@/lib/bella-tips';
import { countDone, loadChecked } from '@/lib/dieta-progress';
import { firstNameFrom, timeGreeting, todayLabel } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media-url';
import { DEFAULT_GOALS } from '@/lib/patient-goals-core';
import { getMealById } from '@/lib/meal-plan-api';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const FALLBACK_METRICS = DEFAULT_GOALS.map((goal) => ({
  id: goal.id,
  label: goal.label,
  value: 0,
}));

function formatGoalMeta(progress: number, goal: { id?: string; type?: string; target?: number; unit?: string; frequency?: string }) {
  const current = Number(progress ?? 0);
  const target = Number(goal?.target ?? 0);
  const unit = goal?.unit ?? '';

  if (goal?.id === 'food' || goal?.type === 'food') {
    return current === 1 ? '1 dia esta semana' : `${current} dias esta semana`;
  }
  if (goal?.id === 'water' || goal?.type === 'water') {
    return `${current} / ${target} L`;
  }
  if (goal?.type === 'sleep') {
    return `${current}h de ${target}h`;
  }
  if (goal?.frequency === 'weekly') {
    return `${current} / ${target} ${unit} na semana`;
  }
  return `${current} / ${target} ${unit} hoje`;
}

function goalBarPct(progress: number, goal: { id?: string; target?: number }, percent: number) {
  if (goal?.id === 'food') {
    const target = Math.max(1, Number(goal?.target ?? 1));
    return Math.min(100, Math.round((Number(progress ?? 0) / target) * 100));
  }
  const fromPercent = Math.min(100, Math.max(0, Number(percent ?? 0)));
  if (fromPercent > 0) return fromPercent;
  const target = Number(goal?.target ?? 0);
  if (!target) return 0;
  return Math.min(100, Math.round((Number(progress ?? 0) / target) * 100));
}

function HomeSection({
  title,
  linkHref,
  linkLabel,
  showLink = true,
  children,
}: {
  title: string;
  linkHref?: string;
  linkLabel?: string;
  showLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {showLink && linkHref && linkLabel ? (
          <Link href={linkHref as never} asChild>
            <Pressable style={styles.sectionLink}>
              <Text style={styles.sectionLinkText}>{linkLabel}</Text>
              <ChevronRight color={colors.primaryDark} size={14} strokeWidth={2} />
            </Pressable>
          </Link>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { hasPaidAccess } = usePatientPlanAccess();
  const readOnlyHome = !hasPaidAccess;
  const { request } = usePatientApi();
  const { todaySummary } = usePatientGoals();
  const { hasPlan: hasMealPlan, meals } = usePatientMealPlan();
  const { resyncAllCheckedMeals } = useDietaDiarySync();
  const {
    dailySummary,
    setDailySummary,
    targets,
    consumed,
    caloriePercent,
    bootstrapDailyHeader,
    refreshActivityForToday,
    loadDailyNutrition,
  } = usePatientDailyHeader();
  const { setDateOffset } = useDiaryDate();
  const {
    checkInStatus,
    fridayPromptOpen,
    loadCheckInAccess,
    dismissFridayPrompt,
    goToCheckIn,
  } = useWeeklyCheckInPrompt();

  const [quickGoalId, setQuickGoalId] = useState('');
  const [featuredCourseId, setFeaturedCourseId] = useState<string | null>(null);

  const firstName = firstNameFrom(user?.name);
  const avatarUrl = resolveMediaUrl(user?.avatar);
  const greeting = timeGreeting();
  const dateLabel = todayLabel();
  const bellaTip = getBellaDailyTip();

  useFocusEffect(
    useCallback(() => {
      setDateOffset(0);
      if (consumeOpenWaterSheetFromIsland()) {
        setQuickGoalId('water');
      }
    }, [setDateOffset]),
  );

  const homeGoalMetrics = useMemo<HomeGoalMetric[]>(() => {
    if (!todaySummary.length) {
      return FALLBACK_METRICS.map((item) => {
        const goal = DEFAULT_GOALS.find((entry) => entry.id === item.id);
        return {
          ...item,
          showPercent: item.id !== 'food',
          meta: goal ? formatGoalMeta(0, goal) : '0% concluído',
          barPct: 0,
        };
      });
    }
    return todaySummary.map((item) => ({
      id: item.goal.id,
      label: item.goal.label,
      value: item.goal.id === 'food' ? item.progress : item.percent,
      showPercent: item.goal.id !== 'food',
      meta: formatGoalMeta(item.progress, item.goal),
      barPct: goalBarPct(item.progress, item.goal, item.percent),
    }));
  }, [todaySummary]);

  const recentMealUploads = useMemo(
    () =>
      [...(dailySummary?.entries || [])]
        .filter((entry) => entry?.imageUrl)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3),
    [dailySummary?.entries],
  );

  const teachHref = featuredCourseId ? `/cursos/${featuredCourseId}` : '/cursos';

  useEffect(() => {
    refreshActivityForToday();
  }, [todaySummary, refreshActivityForToday]);

  useEffect(() => {
    if (!token) return;

    void loadCheckInAccess();
    void bootstrapDailyHeader();
    void request<Array<{ id?: string }>>('/courses')
      .then((courses) => setFeaturedCourseId(courses?.[0]?.id || null))
      .catch(() => {});
  }, [bootstrapDailyHeader, loadCheckInAccess, request, token]);

  useEffect(() => {
    if (!token || !hasMealPlan || !meals.length) return;

    let cancelled = false;
    const mealOrder = meals.map((meal) => meal.id);

    void (async () => {
      try {
        const summary = await resyncAllCheckedMeals(
          (mealId) => getMealById(meals, mealId),
          mealOrder,
          loadChecked,
          countDone,
        );
        if (summary && !cancelled) setDailySummary(summary);
      } catch {
        /* resync opcional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMealPlan, meals, resyncAllCheckedMeals, setDailySummary, token]);

  return (
    <PatientShell>
      <PatientHeader />

      {readOnlyHome ? (
        <View style={styles.lockedWrap}>
          <View style={styles.lockedIcon}>
            <Sparkles color={colors.primaryDark} size={26} strokeWidth={2} />
          </View>
          <Text style={styles.lockedTitle}>Seu acesso ainda não está ativo</Text>
          <Text style={styles.lockedSub}>
            Assim que sua nutricionista liberar seu acesso, seu painel aparece aqui automaticamente.
          </Text>
          <Link href="/assinatura" asChild>
            <Pressable style={styles.lockedBtn}>
              <Text style={styles.lockedBtnText}>Ver meu acesso</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <PatientScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.page}
        >
          <View style={styles.welcome} accessibilityLabel="Boas-vindas">
            <Link href="/perfil" asChild>
              <Pressable style={styles.greetingProfile}>
                <PatientAvatar src={avatarUrl} name={user?.name} size="md" />
                <View style={styles.greetingCopy}>
                  <Text style={styles.greetingHello}>{greeting}, {firstName}</Text>
                  <Text style={styles.greetingSub}>{dateLabel}</Text>
                </View>
                <ChevronRight color="#aeaeb2" size={14} strokeWidth={2} />
              </Pressable>
            </Link>
          </View>

          {hasMealPlan ? (
            <HomeSection
              title="Próxima refeição"
              linkHref="/dieta"
              linkLabel="Ver dieta"
              showLink={!readOnlyHome}
            >
              <HomeCurrentMealCard readOnly={readOnlyHome} onPhotoSaved={loadDailyNutrition} />
            </HomeSection>
          ) : null}

          <HomeSection
            title="Nutrição de hoje"
            linkHref="/evolucao/nutricao"
            linkLabel="Detalhes"
            showLink={!readOnlyHome}
          >
            <HomeNutritionPanel
              targets={targets}
              consumed={consumed}
              percent={caloriePercent}
              readOnly={readOnlyHome}
            />
          </HomeSection>

          {recentMealUploads.length ? (
            <HomeSection
              title="Registros recentes"
              linkHref="/diario"
              linkLabel="Ver diário"
              showLink={!readOnlyHome}
            >
              <HomeRecentMealUploads entries={recentMealUploads} readOnly={readOnlyHome} />
            </HomeSection>
          ) : null}

          <HomeSection
            title="Metas diárias"
            linkHref="/evolucao?tab=metas"
            linkLabel="Ver evolução"
            showLink={!readOnlyHome}
          >
            <HomeGoalsGrid
              metrics={homeGoalMetrics}
              readOnly={readOnlyHome}
              onQuickAdd={(goalId) => {
                if (readOnlyHome) return;
                setQuickGoalId(String(goalId || ''));
              }}
            />
          </HomeSection>

          <View style={styles.section} accessibilityLabel="Assistente Bella">
            <View style={styles.bellaCard}>
              {readOnlyHome ? (
                <>
                  <View style={styles.bellaAction}>
                    <Sparkles color={colors.primaryDark} size={22} strokeWidth={2} />
                    <View style={styles.bellaActionCopy}>
                      <Text style={styles.bellaActionTitle}>Fale com a Bella</Text>
                      <Text style={styles.bellaActionText}>
                        Tire dúvidas sobre alimentação e rotina.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bellaTip}>
                    <Lightbulb color={colors.primaryDark} size={18} strokeWidth={2} />
                    <View style={styles.bellaTipCopy}>
                      <Text style={styles.bellaTipTag}>Bella ensina</Text>
                      <Text style={styles.bellaTipText}>{bellaTip}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Link href="/bella/chat/general" asChild>
                    <Pressable style={styles.bellaAction}>
                      <Sparkles color={colors.primaryDark} size={22} strokeWidth={2} />
                      <View style={styles.bellaActionCopy}>
                        <Text style={styles.bellaActionTitle}>Fale com a Bella</Text>
                        <Text style={styles.bellaActionText}>
                          Tire dúvidas sobre alimentação e rotina.
                        </Text>
                      </View>
                      <ChevronRight color={colors.textMuted} size={16} strokeWidth={2} />
                    </Pressable>
                  </Link>

                  <Link href={teachHref as never} asChild>
                    <Pressable style={styles.bellaTip}>
                      <Lightbulb color={colors.primaryDark} size={18} strokeWidth={2} />
                      <View style={styles.bellaTipCopy}>
                        <Text style={styles.bellaTipTag}>Bella ensina</Text>
                        <Text style={styles.bellaTipText}>{bellaTip}</Text>
                      </View>
                    </Pressable>
                  </Link>
                </>
              )}
            </View>
          </View>
        </PatientScrollView>
      )}

      {hasPaidAccess ? (
        <CheckinFridayPrompt
          open={fridayPromptOpen}
          deadlineLabel={checkInStatus.deadlineLabel || 'segunda-feira'}
          onDismiss={() => void dismissFridayPrompt()}
          onStart={() => void goToCheckIn()}
        />
      ) : null}

      {hasPaidAccess ? (
        <HomeGoalQuickAddSheet
          open={Boolean(quickGoalId)}
          goalId={quickGoalId}
          onClose={() => setQuickGoalId('')}
        />
      ) : null}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    backgroundColor: '#fff',
  },
  lockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
    backgroundColor: '#fff',
  },
  lockedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing[2],
  },
  lockedTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  lockedSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  lockedBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: 12,
    borderRadius: radii.control,
    backgroundColor: colors.primaryDark,
  },
  lockedBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#fff',
  },
  welcome: { marginTop: 6, marginBottom: 20 },
  greetingProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 52,
  },
  greetingCopy: { flex: 1, minWidth: 0 },
  greetingHello: {
    fontFamily: fonts.semibold,
    fontSize: 19,
    color: colors.text,
    letterSpacing: -0.3,
  },
  greetingSub: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6e6e73',
  },
  section: { marginBottom: 28 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 11,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.25,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    paddingLeft: 7,
  },
  sectionLinkText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
  bellaCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  bellaAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.1)',
  },
  bellaActionCopy: { flex: 1, minWidth: 0 },
  bellaActionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  bellaActionText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  bellaTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bellaTipCopy: { flex: 1, minWidth: 0 },
  bellaTipTag: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primaryDark,
    marginBottom: 5,
  },
  bellaTipText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
