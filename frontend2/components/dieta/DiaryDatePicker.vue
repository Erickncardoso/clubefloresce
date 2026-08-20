<template>
  <div
    class="diary-date-picker"
    :class="{ 'diary-date-picker--pill': variant === 'pill' }"
    role="group"
    aria-label="Dia do consumo"
  >
    <template v-if="variant === 'pill'">
      <button
        type="button"
        class="diary-date-picker__pill"
        :class="{ 'diary-date-picker__pill--filtered': filtered }"
        :aria-label="`Dia do consumo: ${pillLabel}`"
        @click="calendarOpen = true"
      >
        <CalendarDays aria-hidden="true" />
        <span>{{ pillLabel }}</span>
      </button>
    </template>

    <template v-else>
      <button
        v-for="option in diaryDateOptions"
        :key="option.id"
        type="button"
        class="diary-date-picker__chip"
        :class="{ active: selectedOffset === option.offset }"
        @click="selectOffset(option.offset)"
      >
        {{ option.label }}
      </button>

      <button
        type="button"
        class="diary-date-picker__calendar"
        :class="{ active: calendarActive }"
        aria-label="Escolher data no calendário"
        @click="calendarOpen = true"
      >
        <CalendarDays aria-hidden="true" />
        <span v-if="calendarActive" class="diary-date-picker__calendar-label">{{ calendarLabel }}</span>
      </button>
    </template>

    <DiaryCalendarSheet
      :open="calendarOpen"
      :selected-date-key="selectedDateKey"
      @close="calendarOpen = false"
      @select="selectDateKey"
    />
  </div>
</template>

<script setup>
import { CalendarDays } from 'lucide-vue-next'
import {
  DIARY_DATE_OPTIONS,
  diaryDateChipOffset,
  formatDiaryDateLabel,
  formatDiaryDatePillLabel,
} from '~/utils/diary-date'

const props = defineProps({
  /** `chips` = atalhos + calendário. `pill` = só data centralizada (Dieta). */
  variant: {
    type: String,
    default: 'chips',
    validator: (value) => ['chips', 'pill'].includes(value),
  },
})

const { selectedDateKey, setDateOffset, setDateKey, isToday } = useDiaryDate()

const diaryDateOptions = DIARY_DATE_OPTIONS
const calendarOpen = ref(false)

const selectedOffset = computed(() => diaryDateChipOffset(selectedDateKey.value))
const calendarActive = computed(() => selectedOffset.value == null)
const filtered = computed(() => !isToday.value)
const pillLabel = computed(() => formatDiaryDatePillLabel(selectedDateKey.value))

const calendarLabel = computed(() => {
  if (!calendarActive.value) return ''
  return formatDiaryDateLabel(selectedDateKey.value)
})

function selectOffset(offset) {
  setDateOffset(offset)
}

function selectDateKey(dateKey) {
  setDateKey(dateKey)
}
</script>

<style scoped>
.diary-date-picker {
  display: flex;
  gap: 0.375rem;
  padding: 0 0 0.75rem;
}

.diary-date-picker--pill {
  justify-content: center;
}

.diary-date-picker__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.25rem;
  padding: 0 0.85rem;
  border: 1px solid var(--cf-border, #e2e5e0);
  border-radius: 999px;
  background: #fff;
  color: var(--cf-text, #1c1816);
  font: 600 0.8125rem/1 inherit;
  cursor: pointer;
}

.diary-date-picker__pill svg {
  width: 0.95rem;
  height: 0.95rem;
  color: #798a70;
}

.diary-date-picker__pill--filtered {
  border-color: #798a70;
  background: #798a70;
  color: #fff;
}

.diary-date-picker__pill--filtered svg {
  color: #fff;
}

.diary-date-picker__chip {
  flex: 1;
  min-height: 2.25rem;
  border: 1px solid var(--cf-border, #e2e5e0);
  border-radius: 999px;
  background: #fff;
  color: #60665e;
  font: 500 0.75rem/1.2 inherit;
  cursor: pointer;
}

.diary-date-picker__chip.active {
  border-color: #798a70;
  background: #798a70;
  color: #fff;
}

.diary-date-picker__calendar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0 0.65rem;
  border: 1px solid var(--cf-border, #e2e5e0);
  border-radius: 999px;
  background: #fff;
  color: #60665e;
  font: 600 0.72rem/1 inherit;
  cursor: pointer;
  flex-shrink: 0;
}

.diary-date-picker__calendar svg {
  width: 0.95rem;
  height: 0.95rem;
}

.diary-date-picker__calendar.active {
  border-color: #798a70;
  background: #798a70;
  color: #fff;
}

.diary-date-picker__calendar-label {
  max-width: 4.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
