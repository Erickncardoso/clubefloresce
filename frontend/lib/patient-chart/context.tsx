'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ApiError } from '@/lib/api'
import {
  asProfile,
  fetchPatientCheckIns,
  fetchPatientFoodDiary,
  fetchPatientMealPlan,
  fetchPatientOverview,
  fetchPatientUser,
  patchPatientUser,
  saveLegacyCheckIn,
  uploadPatientMealPlan,
  type FoodDiaryEntry,
  type LegacyCheckIn,
  type PatientOverview,
  type PatientProfileData,
  type PatientUser,
  type TemplateCheckInResponse,
} from '@/lib/patient-chart/api'
import {
  getActiveEvolucaoSub,
  normalizeChartTab,
  PATIENT_CHART_TABS,
  type ChartTabId,
  type EvolucaoSubId,
  buildChartTabHref,
} from '@/lib/patient-chart/nav'

type PatientChartContextValue = {
  patientId: string
  loading: boolean
  error: string
  user: PatientUser | null
  profile: PatientProfileData
  overview: PatientOverview | null
  mealPlan: unknown
  foodDiary: FoodDiaryEntry[]
  checkInHistory: LegacyCheckIn[]
  templateResponses: TemplateCheckInResponse[]
  currentWeekStart: string
  activeTab: ChartTabId
  evolucaoSubTab: EvolucaoSubId
  tabs: typeof PATIENT_CHART_TABS
  setTab: (tabId: string) => void
  setEvolucaoSubTab: (sub: EvolucaoSubId) => void
  tabHref: (tabId: string, sub?: string) => string
  reload: () => Promise<void>
  loadMealPlanDetail: () => Promise<void>
  saveAccess: (payload: Record<string, unknown>) => Promise<PatientUser>
  patchUser: (payload: Record<string, unknown>) => Promise<PatientUser>
  uploadMealPlan: (file: File) => Promise<unknown>
  saveCheckIn: (body: Record<string, unknown>) => Promise<void>
  setUser: (user: PatientUser | null) => void
}

const PatientChartContext = createContext<PatientChartContextValue | null>(null)

export function PatientChartProvider({
  patientId,
  children,
}: {
  patientId: string
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasLoadedRef = useRef(false)
  const [user, setUser] = useState<PatientUser | null>(null)
  const [overview, setOverview] = useState<PatientOverview | null>(null)
  const [mealPlan, setMealPlan] = useState<unknown>(null)
  const [foodDiary, setFoodDiary] = useState<FoodDiaryEntry[]>([])
  const [checkInHistory, setCheckInHistory] = useState<LegacyCheckIn[]>([])
  const [templateResponses, setTemplateResponses] = useState<TemplateCheckInResponse[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState('')

  const activeTab = normalizeChartTab(searchParams.get('tab'))
  const evolucaoSubTab = getActiveEvolucaoSub(searchParams)

  const profile = useMemo(() => asProfile(user?.patientProfileData), [user])

  const tabHref = useCallback(
    (tabId: string, sub?: string) =>
      buildChartTabHref(patientId, tabId, { sub, basePath: `/pacientes/${encodeURIComponent(patientId)}` }),
    [patientId],
  )

  const setTab = useCallback(
    (tabId: string) => {
      router.replace(tabHref(tabId, tabId === 'evolucao' ? evolucaoSubTab : undefined))
    },
    [router, tabHref, evolucaoSubTab],
  )

  const setEvolucaoSubTab = useCallback(
    (sub: EvolucaoSubId) => {
      router.replace(tabHref('evolucao', sub))
    },
    [router, tabHref],
  )

  const loadAll = useCallback(async () => {
    if (!patientId) return
    // Reload silencioso depois do 1º load — evita desmontar a ficha (ex.: modal de anamnese)
    if (!hasLoadedRef.current) setLoading(true)
    setError('')
    try {
      const nextUser = await fetchPatientUser(patientId)
      setUser(nextUser)

      const [overviewResult, checkInsResult, diaryResult] = await Promise.allSettled([
        fetchPatientOverview(patientId),
        fetchPatientCheckIns(patientId),
        fetchPatientFoodDiary(patientId),
      ])

      let nextOverview: PatientOverview | null = null
      if (overviewResult.status === 'fulfilled') {
        nextOverview = overviewResult.value
        setOverview(nextOverview)
        const overviewPlan = nextOverview?.mealPlan
        if (overviewPlan) {
          setMealPlan((prev: unknown) => ({
            ...(typeof prev === 'object' && prev ? prev : {}),
            id: overviewPlan.id,
            title: overviewPlan.title,
            fileName: overviewPlan.fileName,
            pdfUrl: overviewPlan.pdfUrl,
            mealCount: overviewPlan.mealCount,
            updatedAt: overviewPlan.updatedAt,
            plan:
              typeof prev === 'object' && prev && 'plan' in prev
                ? (prev as { plan?: unknown }).plan
                : overviewPlan.plan || null,
          }))
        }
      }

      if (checkInsResult.status === 'fulfilled') {
        const week = String(checkInsResult.value.weekStart || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || ''
        setCurrentWeekStart(week)
        setCheckInHistory(checkInsResult.value.history)
        setTemplateResponses(checkInsResult.value.responses)
      }

      if (diaryResult.status === 'fulfilled') {
        setFoodDiary(diaryResult.value)
      }

      if (
        nextOverview?.patient?.patientProfileData &&
        (!nextUser.patientProfileData ||
          Object.keys(asProfile(nextUser.patientProfileData)).length === 0)
      ) {
        setUser({
          ...nextUser,
          patientProfileData: nextOverview.patient.patientProfileData,
          phone: nextUser.phone || nextOverview.patient.phone,
        })
      }
      hasLoadedRef.current = true
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Não foi possível carregar o paciente.',
      )
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const loadMealPlanDetail = useCallback(async () => {
    const plan = await fetchPatientMealPlan(patientId)
    setMealPlan(plan)
  }, [patientId])

  useEffect(() => {
    if (activeTab === 'planos' && patientId) {
      void loadMealPlanDetail().catch(() => undefined)
    }
  }, [activeTab, patientId, loadMealPlanDetail])

  const patchUser = useCallback(
    async (payload: Record<string, unknown>) => {
      const updated = await patchPatientUser(patientId, payload)
      setUser((prev) => {
        if (!prev) return updated
        return { ...prev, ...updated }
      })
      setOverview((prev) =>
        prev?.patient
          ? { ...prev, patient: { ...prev.patient, ...updated } }
          : prev,
      )
      return updated
    },
    [patientId],
  )

  const saveAccess = patchUser

  const uploadMealPlan = useCallback(
    async (file: File) => {
      const result = await uploadPatientMealPlan(patientId, file)
      setMealPlan(result?.plan || null)
      if (result?.user) {
        setUser((prev) => {
          if (!prev) return result.user as PatientUser
          return { ...prev, ...result.user }
        })
      }
      try {
        setOverview(await fetchPatientOverview(patientId))
      } catch {
        /* ignore */
      }
      return result
    },
    [patientId],
  )

  const saveCheckIn = useCallback(
    async (body: Record<string, unknown>) => {
      await saveLegacyCheckIn(patientId, body)
      const [checkIns, nextOverview] = await Promise.all([
        fetchPatientCheckIns(patientId),
        fetchPatientOverview(patientId),
      ])
      const week = String(checkIns.weekStart || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || ''
      setCurrentWeekStart(week)
      setCheckInHistory(checkIns.history)
      setTemplateResponses(checkIns.responses)
      setOverview(nextOverview)
    },
    [patientId],
  )

  const value = useMemo<PatientChartContextValue>(
    () => ({
      patientId,
      loading,
      error,
      user,
      profile,
      overview,
      mealPlan,
      foodDiary,
      checkInHistory,
      templateResponses,
      currentWeekStart,
      activeTab,
      evolucaoSubTab,
      tabs: PATIENT_CHART_TABS,
      setTab,
      setEvolucaoSubTab,
      tabHref,
      reload: loadAll,
      loadMealPlanDetail,
      saveAccess,
      patchUser,
      uploadMealPlan,
      saveCheckIn,
      setUser,
    }),
    [
      patientId,
      loading,
      error,
      user,
      profile,
      overview,
      mealPlan,
      foodDiary,
      checkInHistory,
      templateResponses,
      currentWeekStart,
      activeTab,
      evolucaoSubTab,
      setTab,
      setEvolucaoSubTab,
      tabHref,
      loadAll,
      loadMealPlanDetail,
      saveAccess,
      patchUser,
      uploadMealPlan,
      saveCheckIn,
      pathname,
    ],
  )

  return (
    <PatientChartContext.Provider value={value}>{children}</PatientChartContext.Provider>
  )
}

export function usePatientChart() {
  const ctx = useContext(PatientChartContext)
  if (!ctx) throw new Error('usePatientChart must be used within PatientChartProvider')
  return ctx
}

export function usePatientChartOptional() {
  return useContext(PatientChartContext)
}
