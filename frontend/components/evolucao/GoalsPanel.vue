<template>
  <div class="evo-goals">
    <article
      v-for="item in todaySummary"
      :key="item.goal.id"
      class="evo-goal-card"
      :class="`evo-goal-card--${item.goal.id}`"
    >
      <header class="evo-goal-head">
        <div class="evo-goal-head-copy">
          <span class="evo-goal-icon" aria-hidden="true">
            <component :is="goalIcon(item.goal)" class="evo-goal-icon-svg" />
          </span>
          <div>
            <h3>{{ item.goal.label }}</h3>
            <p class="evo-goal-meta">
              <template v-if="item.goal.id === 'food'">
                Semanal · {{ item.progress }} {{ item.progress === 1 ? 'dia registrado' : 'dias registrados' }}
              </template>
              <template v-else>
                {{ frequencyLabel(item.goal.frequency) }} · {{ item.progress }} / {{ item.goal.target }} {{ item.goal.unit }}
              </template>
            </p>
          </div>
        </div>
        <span v-if="item.goal.id === 'food'" class="evo-goal-pct evo-goal-pct--count">{{ item.progress }}</span>
        <span v-else class="evo-goal-pct">{{ item.percent }}%</span>
      </header>

      <div class="evo-goal-surface">
        <div class="evo-goal-widget">
        <EvolucaoWaterBottle
          v-if="item.goal.type === 'water'"
          :current="item.progress"
          :target="item.goal.target"
          @increment="incrementGoal(item.goal.id)"
          @decrement="decrementGoal(item.goal.id)"
        />

        <EvolucaoFoodPlate
          v-else-if="item.goal.id === 'food'"
          :selected-days="foodSelectedDays"
          :today-index="todayWeekdayIndex"
          @toggle-day="toggleFoodDay"
        />

        <EvolucaoExerciseArm
          v-else-if="item.goal.id === 'exercise'"
          :current="item.progress"
          :target="item.goal.target"
          @increment="incrementGoal(item.goal.id)"
          @decrement="decrementGoal(item.goal.id)"
        />

        <EvolucaoSleepChart
          v-else-if="item.goal.id === 'sleep'"
          :target="item.goal.target"
          :schedule="sleepSchedule"
          @shift-bed="shiftSleepTime('bed', $event)"
          @shift-wake="shiftSleepTime('wake', $event)"
          @set-schedule="setSleepSchedule($event.bedMinutes, $event.wakeMinutes)"
        />

        <template v-else>
          <div class="evo-goal-actions">
            <button type="button" class="evo-goal-btn" aria-label="Diminuir" @click="decrementGoal(item.goal.id)">
              <Minus class="evo-goal-btn-icon" aria-hidden="true" />
            </button>
            <span class="evo-goal-value">{{ item.progress }} / {{ item.goal.target }}</span>
            <button
              type="button"
              class="evo-goal-btn evo-goal-btn--primary"
              aria-label="Aumentar"
              @click="incrementGoal(item.goal.id)"
            >
              <Plus class="evo-goal-btn-icon" aria-hidden="true" />
            </button>
          </div>
        </template>
        </div>
      </div>

      <button
        v-if="item.goal.id !== 'food'"
        type="button"
        class="evo-goal-edit"
        @click="openEdit(item.goal)"
      >
        Ajustar meta
      </button>
    </article>

    <button type="button" class="evo-add-goal" @click="showAdd = true">
      + Nova meta
    </button>

    <div v-if="editingGoal || showAdd" class="evo-modal-overlay" @click.self="closeModal">
      <div class="evo-modal">
        <h2>{{ showAdd ? 'Nova meta' : 'Ajustar meta' }}</h2>

        <label class="evo-field">
            Nome
            <input v-model="form.label" type="text" maxlength="40" />
          </label>
          <label class="evo-field">
            Meta
            <input v-model.number="form.target" type="number" min="1" max="99" />
          </label>
          <label class="evo-field">
            Unidade
            <input v-model="form.unit" type="text" maxlength="20" />
          </label>
          <label class="evo-field">
            Frequência
            <select v-model="form.frequency">
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
            </select>
          </label>
        <div class="evo-modal-actions">
          <button type="button" class="evo-modal-cancel" @click="closeModal">Cancelar</button>
          <button type="button" class="evo-modal-save" @click="saveForm">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Cookie, Droplets, Dumbbell, Minus, Moon, Plus, Sparkles } from 'lucide-vue-next'

const {
  todaySummary,
  hydrate,
  incrementGoal,
  decrementGoal,
  updateGoal,
  addGoal,
  sleepSchedule,
  setSleepSchedule,
  shiftSleepTime,
  getFoodSelectedDays,
  toggleFoodDay,
  weekdayIndex,
} = usePatientGoals()

const showAdd = ref(false)
const editingGoal = ref(null)
const form = reactive({
  label: '',
  target: 1,
  unit: '',
  frequency: 'daily',
})

const foodSelectedDays = computed(() => getFoodSelectedDays())
const todayWeekdayIndex = computed(() => weekdayIndex())

onMounted(hydrate)

function goalIcon(goal) {
  if (goal.type === 'water') return Droplets
  if (goal.id === 'food') return Cookie
  if (goal.id === 'exercise') return Dumbbell
  if (goal.id === 'sleep') return Moon
  return Sparkles
}

function frequencyLabel(frequency) {
  return frequency === 'weekly' ? 'Semanal' : 'Diária'
}

function openEdit(goal) {
  editingGoal.value = goal
  form.label = goal.label
  form.target = goal.target
  form.unit = goal.unit
  form.frequency = goal.frequency
  showAdd.value = false
}

function closeModal() {
  showAdd.value = false
  editingGoal.value = null
}

function saveForm() {
  const payload = {
    label: form.label.trim() || 'Meta',
    target: Math.max(1, Math.min(99, Number(form.target) || 1)),
    unit: form.unit.trim() || 'vezes',
    frequency: form.frequency === 'weekly' ? 'weekly' : 'daily',
  }

  if (showAdd.value) {
    addGoal({ ...payload, type: 'habit', color: '#8B967C' })
  } else if (editingGoal.value) {
    updateGoal(editingGoal.value.id, payload)
  }
  closeModal()
}
</script>

<style scoped>
.evo-goals {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.evo-goal-card {
  padding: 1rem 1.05rem 0.95rem;
  border-radius: 1.35rem;
  border: none;
  background: #f3f4f6;
  box-shadow: none;
}

.evo-goal-card--water {
  background: #e8f0fb;
}

.evo-goal-card--food {
  background: #f8f0ed;
}

.evo-goal-card--exercise {
  background: #eef0eb;
}

.evo-goal-card--sleep {
  background: #f3f4f6;
}

.evo-goal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.evo-goal-head-copy {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}

.evo-goal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  flex-shrink: 0;
  color: var(--cf-text);
}

.evo-goal-card--water .evo-goal-icon {
  color: #4a8fc4;
}

.evo-goal-card--food .evo-goal-icon {
  color: #9d7268;
}

.evo-goal-card--exercise .evo-goal-icon {
  color: #5f8f58;
}

.evo-goal-card--sleep .evo-goal-icon {
  color: #6b74b8;
}

.evo-goal-icon-svg {
  width: 1rem;
  height: 1rem;
}

.evo-goal-head h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--cf-text);
}

.evo-goal-pct {
  font-size: 1.55rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--cf-text);
}

.evo-goal-pct--count {
  font-size: 1.55rem;
}

.evo-goal-meta {
  margin: 0.18rem 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: rgba(28, 24, 22, 0.52);
}

.evo-goal-surface {
  padding: 0.75rem 0.65rem 0.7rem;
  border-radius: 1.1rem;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65);
}

.evo-goal-widget {
  padding: 0;
}

.evo-goal-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.35rem 0;
}

.evo-goal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  font-family: inherit;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  -webkit-tap-highlight-color: transparent;
}

.evo-goal-btn--primary {
  background: var(--cf-green-dark);
  color: #fff;
}

.evo-goal-btn-icon {
  width: 1rem;
  height: 1rem;
  stroke-width: 2.5;
  flex-shrink: 0;
}

.evo-goal-value {
  font-size: 0.85rem;
  font-weight: 700;
  min-width: 4.5rem;
  text-align: center;
}

.evo-goal-edit {
  margin-top: 0.65rem;
  padding: 0.35rem 0.5rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--cf-pink-dark);
  cursor: pointer;
}

.evo-add-goal {
  padding: 0.9rem 1rem;
  border: none;
  border-radius: 1.35rem;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--cf-pink-dark);
  cursor: pointer;
}

.evo-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.35);
}

.evo-modal {
  width: 100%;
  max-width: 430px;
  padding: 1.15rem;
  border-radius: 1.35rem 1.35rem 1rem 1rem;
  background: var(--cf-surface);
  border: 1px solid rgba(28, 24, 22, 0.06);
}

.evo-modal h2 {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
}

.evo-modal-copy {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--cf-text-muted);
}

.evo-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.7rem;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.evo-field input,
.evo-field select {
  padding: 0.65rem 0.75rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control, 14px);
  font-family: inherit;
  font-size: 0.88rem;
}

.evo-modal-actions {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.55rem;
}

.evo-modal-cancel,
.evo-modal-save {
  flex: 1;
  padding: 0.7rem;
  border-radius: 999px;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
}

.evo-modal-cancel {
  border: 1.5px solid #e8ece9;
  background: var(--cf-surface);
}

.evo-modal-save {
  border: none;
  background: var(--cf-green-dark);
  color: #fff;
}
</style>
