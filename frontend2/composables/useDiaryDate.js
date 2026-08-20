import { getLocalDateKey } from '~/utils/local-date'
import {
  dateKeyForOffset,
  DIARY_DATE_OPTIONS,
  formatDiaryDateLabel,
  compareDateKeys,
  withDiaryDateQuery,
} from '~/utils/diary-date'

export function useDiaryDate() {
  const { patientTimeHeaders } = usePatientLocalTime()
  const selectedDateKey = useState('patient-diary-date-key', () => getLocalDateKey())

  const isToday = computed(() => selectedDateKey.value === getLocalDateKey())

  const diaryTitle = computed(() => {
    if (isToday.value) return 'Diário de hoje'
    return `Diário de ${formatDiaryDateLabel(selectedDateKey.value)}`
  })

  function setDateOffset(offset) {
    selectedDateKey.value = dateKeyForOffset(offset)
  }

  function setDateKey(next) {
    const trimmed = String(next || '').trim().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return
    if (compareDateKeys(trimmed, getLocalDateKey()) > 0) return
    selectedDateKey.value = trimmed
  }

  function diaryFetchInit(init = {}) {
    const baseHeaders = init.headers || {}
    const headers = baseHeaders instanceof Headers
      ? (() => {
        const merged = new Headers(baseHeaders)
        merged.set('X-Patient-Date', selectedDateKey.value)
        return merged
      })()
      : { ...baseHeaders, 'X-Patient-Date': selectedDateKey.value }
    return patientFetchInit({ ...init, headers })
  }

  function foodDiaryPath(path) {
    return withDiaryDateQuery(path, selectedDateKey.value)
  }

  return {
    selectedDateKey,
    isToday,
    diaryTitle,
    diaryDateOptions: DIARY_DATE_OPTIONS,
    formatDiaryDateLabel,
    setDateOffset,
    setDateKey,
    diaryFetchInit,
    foodDiaryPath,
  }
}
