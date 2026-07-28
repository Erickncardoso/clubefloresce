import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { ChevronRight, Lightbulb, Sparkles } from 'lucide-react-native';
import CheckinFridayPrompt from '@/components/home/CheckinFridayPrompt';
import HomeCurrentMealCard from '@/components/home/HomeCurrentMealCard';
import HomeGoalQuickAddSheet from '@/components/home/HomeGoalQuickAddSheet';
import HomeGoalsGrid, { type HomeGoalMetric } from '@/components/home/HomeGoalsGrid';
import HomeNutritionPanel from '@/components/home/HomeNutritionPanel';
import HomeRecentMealUploads from '@/components/home/HomeRecentMealUploads';
import PatientHeaderDailyChip from '@/components/home/PatientHeaderDailyChip';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PatientHeader from '@/components/ui/PatientHeader';
import { useDietaDiarySync } from '@/hooks/useDietaDiarySync';
import { usePatientPlanAccess } from '@/hooks/usePatientPlanAccess';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientDailyHeader } from '@/hooks/usePatientDailyHeader';
import { usePatientGoals } from '@/hooks/usePatientGoals';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { useWeeklyCheckInPrompt } from '@/hooks/useWeeklyCheckInPrompt';
import { getBellaDailyTip } from '@/lib/bella-tips';
import { countDone, loadChecked } from '@/lib/dieta-progress';
import { firstNameFrom, timeGreeting, todayLabel } from '@/lib/format';
import { DEFAULT_GOALS } from '@/lib/patient-goals-core';
import { extractMealPlanMeals, getMealById } from '@/lib/meal-plan-api';
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
  return Math.min(100, Number(percent ?? 0));
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
  const { todaySummary, hydrate: hydrateGoals } = usePatientGoals();
  const { fetchPlan, hasPlan: hasMealPlan, meals } = usePatientMealPlan();
  const { resyncAllCheckedMeals } = useDietaDiarySync();
  const {
    dailySummary,
    setDailySummary,
    targets,
    consumed,
    caloriePercent,
    activeStreak,
    bootstrapDailyHeader,
    refreshActivityForToday,
  } = usePatientDailyHeader();
  const {
    checkInStatus,
    fridayPromptOpen,
    loadCheckInAccess,
    dismissFridayPrompt,
    goToCheckIn,
  } = useWeeklyCheckInPrompt();

  const [pageLoading, setPageLoading] = useState(true);
  const [quickGoalId, setQuickGoalId] = useState('');
  const [featuredCourseId, setFeaturedCourseId] = useState<string | null>(null);

  const firstName = firstNameFrom(user?.name);
  const avatarUrl = user?.avatar || null;
  const greeting = timeGreeting();
  const dateLabel = todayLabel();
  const bellaTip = getBellaDailyTip();

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

    let cancelled = false;

    const runWithTimeout = async (task: () => Promise<void>, ms = 8000) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, ms);
      });
      try {
        await Promise.race([task(), timeout]);
      } catch {
        /* defaults abaixo */
      } finally {
        clearTimeout(timeoutId);
      }
    };

    setPageLoading(true);
    hydrateGoals();
    void loadCheckInAccess();

    void fetchPlan().then(async (planRecord) => {
      if (cancelled || !planRecord || !extractMealPlanMeals(planRecord).length) return;
      const mappedMeals = extractMealPlanMeals(planRecord);
      const mealOrder = mappedMeals.map((meal) => meal.id);
      try {
        const summary = await resyncAllCheckedMeals(
          (mealId) => getMealById(mappedMeals, mealId),
          mealOrder,
          loadChecked,
          countDone,
        );
        if (summary && !cancelled) setDailySummary(summary);
      } catch {
        /* resync opcional — não bloqueia a home */
      }
    });

    const finishLoading = () => {
      if (!cancelled) setPageLoading(false);
    };

    const safetyTimer = setTimeout(finishLoading, 10000);

    void (async () => {
      try {
        await Promise.allSettled([
          runWithTimeout(async () => {
            const courses = await request<Array<{ id?: string }>>('/courses');
            if (!cancelled) setFeaturedCourseId(courses?.[0]?.id || null);
          }),
          runWithTimeout(bootstrapDailyHeader),
        ]);
      } finally {
        clearTimeout(safetyTimer);
        finishLoading();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
    // Só re-bootstrap quando a sessão muda — evita loop por callbacks instáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const initials = firstName.slice(0, 1).toUpperCase();

  return (
    <PatientShell>
      <PatientHeader
        menuLeft
        showMenu
        showBell
        hideBrand
        actions={<PatientHeaderDailyChip activeStreak={activeStreak} />}
      />

      {pageLoading ? (
        <LoadingScreen />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.page}
        >
          <View style={styles.welcome} accessibilityLabel="Boas-vindas">
            <Link href="/perfil" asChild>
              <Pressable style={styles.greetingProfile}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
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
              <HomeCurrentMealCard readOnly={readOnlyHome} />
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
              linkHref="/evolucao/nutricao"
              linkLabel="Ver histórico"
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
        </ScrollView>
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
    paddingBottom: spacing[6],
    backgroundColor: '#fff',
  },
  welcome: { marginTop: 6, marginBottom: 20 },
  greetingProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 52,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.primaryDark,
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
