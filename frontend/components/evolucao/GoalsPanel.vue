<template>
  <div class="evo-goals">
    <article
      v-for="item in todaySummary"
      :key="item.goal.id"
      class="evo-goal-card cf-squircle"
    >
      <div class="evo-goal-head">
        <div>
          <h3>{{ item.goal.label }}</h3>
          <p>{{ frequencyLabel(item.goal.frequency) }} · meta {{ item.goal.target }} {{ item.goal.unit }}</p>
        </div>
        <span class="evo-goal-pct">{{ item.percent }}%</span>
      </div>

      <EvolucaoWaterBottle
        v-if="item.goal.type === 'water'"
        :current="item.progress"
        :target="item.goal.target"
        @increment="incrementGoal(item.goal.id)"
        @decrement="decrementGoal(item.goal.id)"
      />

      <EvolucaoFoodPlate
        v-else-if="item.goal.id === 'food'"
        :current="item.progress"
        :target="item.goal.target"
        @increment="incrementGoal(item.goal.id)"
        @decrement="decrementGoal(item.goal.id)"
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
        <div class="evo-goal-track" role="progressbar" :aria-valuenow="item.percent" aria-valuemin="0" aria-valuemax="100">
          <div class="evo-goal-fill" :style="{ width: `${item.percent}%`, backgroundColor: item.goal.color }" />
        </div>
        <div class="evo-goal-actions">
          <button type="button" class="evo-goal-btn" @click="decrementGoal(item.goal.id)">−</button>
          <span class="evo-goal-value">{{ item.progress }} / {{ item.goal.target }}</span>
          <button type="button" class="evo-goal-btn evo-goal-btn--primary" :style="{ backgroundColor: item.goal.color }" @click="incrementGoal(item.goal.id)">+</button>
        </div>
      </template>

      <button type="button" class="evo-goal-edit" @click="openEdit(item.goal)">Ajustar meta</button>
    </article>

    <button type="button" class="evo-add-goal" @click="showAdd = true">+ Nova meta</button>

    <NuxtLink to="/check-in" class="evo-checkin-link">
      Check-in semanal
      <ChevronRight class="evo-checkin-link-icon" />
    </NuxtLink>

    <div v-if="editingGoal || showAdd" class="evo-modal-overlay" @click.self="closeModal">
      <div class="evo-modal cf-squircle">
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
import { ChevronRight } from 'lucide-vue-next'

const {
  todaySummary,
  hydrate,
  incrementGoal,
  decrementGoal,
  updateGoal,
  addGoal,
  getSleepSchedule,
  setSleepSchedule,
  shiftSleepTime,
} = usePatientGoals()

const sleepSchedule = computed(() => getSleepSchedule())

const showAdd = ref(false)
const editingGoal = ref(null)
const form = reactive({
  label: '',
  target: 1,
  unit: '',
  frequency: 'daily',
})

onMounted(hydrate)

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
    addGoal({ ...payload, type: 'habit', color: '#c17b80' })
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
  gap: 0.85rem;
}

.evo-goal-card {
  padding: 1rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
}

.evo-goal-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.evo-goal-head h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.evo-goal-head p {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.evo-goal-pct {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--cf-text-muted);
}

.evo-goal-track {
  height: 8px;
  border-radius: 999px;
  background: var(--cf-track);
  overflow: hidden;
  margin-bottom: 0.65rem;
}

.evo-goal-fill {
  height: 100%;
  border-radius: 999px;
}

.evo-goal-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.evo-goal-btn {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: var(--cf-surface);
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}

.evo-goal-btn--primary {
  border: none;
  color: #fff;
}

.evo-goal-value {
  font-size: 0.82rem;
  font-weight: 600;
  min-width: 4.5rem;
  text-align: center;
}

.evo-goal-edit {
  margin-top: 0.75rem;
  padding: 0;
  border: none;
  background: none;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  cursor: pointer;
}

.evo-add-goal {
  padding: 0.75rem;
  border: 1px dashed var(--cf-border);
  border-radius: 14px;
  background: #fafafa;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  cursor: pointer;
}

.evo-checkin-link {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  text-decoration: none;
}

.evo-checkin-link-icon {
  width: 0.85rem;
  height: 0.85rem;
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
  padding: 1rem;
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
}

.evo-modal h2 {
  margin: 0 0 0.85rem;
  font-size: 1rem;
}

.evo-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.65rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.evo-field input,
.evo-field select {
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.85rem;
}

.evo-modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.evo-modal-cancel,
.evo-modal-save {
  flex: 1;
  padding: 0.65rem;
  border-radius: 10px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
}

.evo-modal-cancel {
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
}

.evo-modal-save {
  border: none;
  background: var(--cf-pink);
  color: #fff;
}
</style>
