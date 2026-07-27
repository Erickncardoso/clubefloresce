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
        <div class="evo-goal-status">
          <strong>{{ item.goal.id === 'food' ? item.progress : `${item.percent}%` }}</strong>
          <span>{{ item.goal.id === 'food' ? (item.progress === 1 ? 'dia' : 'dias') : 'concluído' }}</span>
        </div>
      </header>

      <div
        class="evo-goal-progress"
        role="progressbar"
        :aria-label="`Progresso de ${item.goal.label}`"
        :aria-valuenow="item.percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :style="{ width: `${Math.min(100, item.percent)}%` }" />
      </div>

      <div class="evo-goal-surface">
        <div class="evo-goal-widget">
        <EvolucaoWaterBottle
          v-if="item.goal.type === 'water'"
          :current="item.progress"
          :target="item.goal.target"
          @increment="incrementGoal(item.goal.id, $event)"
          @decrement="decrementGoal(item.goal.id, $event)"
        />

        <EvolucaoFoodPlate
          v-else-if="item.goal.id === 'food'"
          :selected-days="foodSelectedDays"
          :today-index="todayWeekdayIndex"
          compact
          @open-editor="openFoodEditor(item.goal)"
        />

        <EvolucaoExerciseArm
          v-else-if="item.goal.id === 'exercise'"
          :current="item.progress"
          :target="item.goal.target"
          compact
          @open-editor="openExerciseEditor(item.goal, 'progress')"
        />

        <EvolucaoSleepChart
          v-else-if="item.goal.id === 'sleep'"
          :target="item.goal.target"
          :schedule="sleepSchedule"
          compact
          @open-editor="openSleepEditor(item.goal, 'bed')"
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
        @click="openGoalEditor(item.goal)"
      >
        Ajustar meta
      </button>
    </article>

    <button type="button" class="evo-add-goal" @click="showAdd = true">
      + Nova meta
    </button>

    <Transition name="evo-water-sheet">
      <div
        v-if="isEditingWater"
        class="evo-modal-overlay evo-modal-overlay--water"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="evo-modal evo-modal--water"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evo-water-modal-title"
        >
          <span class="evo-modal-handle" aria-hidden="true" />

          <header class="evo-water-sheet-head">
            <span class="evo-water-sheet-icon" aria-hidden="true">
              <Droplets />
            </span>
            <div>
              <h2 id="evo-water-modal-title">Hidratação</h2>
              <p>Ajuste sua meta e o volume dos recipientes.</p>
            </div>
            <button
              ref="waterCloseButton"
              type="button"
              class="evo-modal-close"
              aria-label="Fechar"
              @click="closeModal"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <section class="evo-water-hero" aria-label="Progresso de hidratação de hoje">
            <div
              class="evo-water-ring"
              role="progressbar"
              aria-label="Meta de hidratação concluída"
              :aria-valuenow="waterProgressPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <svg viewBox="0 0 240 240" aria-hidden="true">
                <g>
                  <path
                    class="evo-water-ring-track"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                  />
                  <path
                    class="evo-water-ring-value"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                    :style="{ strokeDashoffset: waterRingDashOffset }"
                  />
                </g>
              </svg>
              <div
                class="evo-water-ring-label"
                :class="{ 'evo-water-ring-label--triple': waterProgressPercent >= 100 }"
              >
                <strong>{{ waterProgressPercent }}%</strong>
                <span>concluído</span>
              </div>
            </div>

            <div class="evo-water-summary">
              <div class="evo-water-summary-today">
                <span>Hoje</span>
                <strong>
                  {{ formatWaterMl(waterCurrentMl) }}
                  <small>ml</small>
                </strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Meta do dia</span>
                <strong>{{ formatWaterMl(waterTargetMl) }} ml</strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Faltam</span>
                <strong>{{ formatWaterMl(waterRemainingMl) }} ml</strong>
              </div>
            </div>
          </section>

          <section class="evo-water-picker" aria-labelledby="evo-water-picker-title">
            <div class="evo-water-picker-head">
              <div>
                <h3 id="evo-water-picker-title">O que deseja ajustar?</h3>
                <p>{{ activeWaterSettingDescription }}</p>
              </div>
            </div>

            <div class="evo-water-value-picker">
              <button
                type="button"
                :aria-label="`Diminuir ${activeWaterSettingLabel}`"
                :disabled="!canDecreaseWaterSetting"
                @click="adjustActiveWaterSetting(-1)"
              >
                {{ previousWaterSettingValue }}
              </button>
              <output
                aria-live="polite"
                :aria-label="`${activeWaterSettingLabel}: ${currentWaterSettingValue}`"
              >
                {{ currentWaterSettingValue }}
              </output>
              <button
                type="button"
                :aria-label="`Aumentar ${activeWaterSettingLabel}`"
                :disabled="!canIncreaseWaterSetting"
                @click="adjustActiveWaterSetting(1)"
              >
                {{ nextWaterSettingValue }}
              </button>
            </div>
            <span class="evo-water-picker-unit">{{ activeWaterSettingUnit }}</span>

            <div class="evo-water-setting-tabs" role="tablist" aria-label="Configuração de hidratação">
              <button
                type="button"
                role="tab"
                :aria-selected="activeWaterSetting === 'target'"
                :class="{ 'evo-water-setting-tab--active': activeWaterSetting === 'target' }"
                @click="activeWaterSetting = 'target'"
              >
                <Droplets aria-hidden="true" />
                Meta
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeWaterSetting === 'glass'"
                :class="{ 'evo-water-setting-tab--active': activeWaterSetting === 'glass' }"
                @click="activeWaterSetting = 'glass'"
              >
                <span class="evo-water-setting-vessel" aria-hidden="true">
                  <EvolucaoWaterVesselIcon kind="glass" :fill-percent="72" />
                </span>
                Copo
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeWaterSetting === 'bottle'"
                :class="{ 'evo-water-setting-tab--active': activeWaterSetting === 'bottle' }"
                @click="activeWaterSetting = 'bottle'"
              >
                <span class="evo-water-setting-vessel" aria-hidden="true">
                  <EvolucaoWaterVesselIcon kind="bottle" :fill-percent="72" />
                </span>
                Garrafa
              </button>
            </div>
            <p class="evo-water-picker-hint">Toque nos valores laterais para ajustar</p>
          </section>

          <button type="button" class="evo-water-save" @click="saveForm">
            Salvar ajustes
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="evo-water-sheet">
      <div
        v-if="isEditingFood"
        class="evo-modal-overlay evo-modal-overlay--water"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="evo-modal evo-modal--water evo-modal--food"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evo-food-modal-title"
        >
          <span class="evo-modal-handle" aria-hidden="true" />

          <header class="evo-water-sheet-head">
            <span class="evo-water-sheet-icon evo-food-sheet-icon" aria-hidden="true">
              <Cookie />
            </span>
            <div>
              <h2 id="evo-food-modal-title">Refeição livre</h2>
              <p>Registre os dias desta semana.</p>
            </div>
            <button
              ref="foodCloseButton"
              type="button"
              class="evo-modal-close"
              aria-label="Fechar"
              @click="closeModal"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <section class="evo-water-hero evo-food-hero" aria-label="Progresso semanal de refeição livre">
            <div
              class="evo-water-ring evo-food-ring"
              role="progressbar"
              aria-label="Meta semanal concluída"
              :aria-valuenow="foodProgressPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <svg viewBox="0 0 240 240" aria-hidden="true">
                <g>
                  <path
                    class="evo-water-ring-track"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                  />
                  <path
                    class="evo-water-ring-value"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                    :style="{ strokeDashoffset: foodRingDashOffset }"
                  />
                </g>
              </svg>
              <div
                class="evo-water-ring-label"
                :class="{ 'evo-water-ring-label--triple': foodProgressPercent >= 100 }"
              >
                <strong>{{ foodProgressPercent }}%</strong>
                <span>concluído</span>
              </div>
            </div>

            <div class="evo-water-summary evo-food-summary">
              <div class="evo-water-summary-today">
                <span>Esta semana</span>
                <strong>
                  {{ foodDraftDays.length }}
                  <small>{{ foodDraftDays.length === 1 ? 'dia' : 'dias' }}</small>
                </strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Meta semanal</span>
                <strong>{{ foodTargetDays }} {{ foodTargetDays === 1 ? 'dia' : 'dias' }}</strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Faltam</span>
                <strong>{{ foodRemainingDays }} {{ foodRemainingDays === 1 ? 'dia' : 'dias' }}</strong>
              </div>
            </div>
          </section>

          <section class="evo-food-picker" aria-labelledby="evo-food-picker-title">
            <div class="evo-water-picker-head">
              <div>
                <h3 id="evo-food-picker-title">Em quais dias?</h3>
                <p>Selecione somente os dias em que fez uma refeição livre.</p>
              </div>
            </div>

            <EvolucaoFoodPlate
              :selected-days="foodDraftDays"
              :today-index="todayWeekdayIndex"
              editor
              @toggle-day="toggleDraftFoodDay"
            />
          </section>

          <button type="button" class="evo-water-save" @click="saveFoodDraft">
            Salvar registros
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="evo-water-sheet">
      <div
        v-if="isEditingExercise"
        class="evo-modal-overlay evo-modal-overlay--water"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="evo-modal evo-modal--water evo-modal--exercise"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evo-exercise-modal-title"
        >
          <span class="evo-modal-handle" aria-hidden="true" />

          <header class="evo-water-sheet-head">
            <span class="evo-water-sheet-icon evo-exercise-sheet-icon" aria-hidden="true">
              <Dumbbell />
            </span>
            <div>
              <h2 id="evo-exercise-modal-title">Exercício</h2>
              <p>Registre seus treinos e ajuste a meta semanal.</p>
            </div>
            <button
              ref="exerciseCloseButton"
              type="button"
              class="evo-modal-close"
              aria-label="Fechar"
              @click="closeModal"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <section class="evo-water-hero evo-exercise-hero" aria-label="Progresso semanal de exercício">
            <div
              class="evo-water-ring evo-exercise-ring"
              role="progressbar"
              aria-label="Meta semanal de exercícios concluída"
              :aria-valuenow="exerciseProgressPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <svg viewBox="0 0 240 240" aria-hidden="true">
                <g>
                  <path
                    class="evo-water-ring-track"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                  />
                  <path
                    class="evo-water-ring-value"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                    :style="{ strokeDashoffset: exerciseRingDashOffset }"
                  />
                </g>
              </svg>
              <div
                class="evo-water-ring-label"
                :class="{ 'evo-water-ring-label--triple': exerciseProgressPercent >= 100 }"
              >
                <strong>{{ exerciseProgressPercent }}%</strong>
                <span>concluído</span>
              </div>
            </div>

            <div class="evo-water-summary evo-exercise-summary">
              <div class="evo-water-summary-today">
                <span>Esta semana</span>
                <strong>
                  {{ exerciseDraft.progress }}
                  <small>{{ exerciseDraft.progress === 1 ? 'treino' : 'treinos' }}</small>
                </strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Meta semanal</span>
                <strong>{{ exerciseDraft.target }} treinos</strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Faltam</span>
                <strong>{{ exerciseRemaining }} {{ exerciseRemaining === 1 ? 'treino' : 'treinos' }}</strong>
              </div>
            </div>
          </section>

          <section class="evo-water-picker" aria-labelledby="evo-exercise-picker-title">
            <div class="evo-water-picker-head">
              <div>
                <h3 id="evo-exercise-picker-title">O que deseja ajustar?</h3>
                <p>{{ exerciseSettingConfig.description }}</p>
              </div>
            </div>

            <div class="evo-water-value-picker">
              <button
                type="button"
                :aria-label="`Diminuir ${exerciseSettingConfig.label}`"
                :disabled="!canDecreaseExerciseSetting"
                @click="adjustExerciseSetting(-1)"
              >
                {{ previousExerciseSettingValue }}
              </button>
              <output
                aria-live="polite"
                :aria-label="`${exerciseSettingConfig.label}: ${exerciseSettingValue}`"
              >
                {{ exerciseSettingValue }}
              </output>
              <button
                type="button"
                :aria-label="`Aumentar ${exerciseSettingConfig.label}`"
                :disabled="!canIncreaseExerciseSetting"
                @click="adjustExerciseSetting(1)"
              >
                {{ nextExerciseSettingValue }}
              </button>
            </div>
            <span class="evo-water-picker-unit">treinos</span>

            <div class="evo-water-setting-tabs evo-exercise-setting-tabs" role="tablist" aria-label="Configuração de exercícios">
              <button
                type="button"
                role="tab"
                :aria-selected="activeExerciseSetting === 'progress'"
                :class="{ 'evo-water-setting-tab--active': activeExerciseSetting === 'progress' }"
                @click="activeExerciseSetting = 'progress'"
              >
                <Dumbbell aria-hidden="true" />
                Realizados
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeExerciseSetting === 'target'"
                :class="{ 'evo-water-setting-tab--active': activeExerciseSetting === 'target' }"
                @click="activeExerciseSetting = 'target'"
              >
                <Target aria-hidden="true" />
                Meta
              </button>
            </div>
            <p class="evo-water-picker-hint">Toque nos valores laterais para ajustar</p>
          </section>

          <button type="button" class="evo-water-save" @click="saveExerciseDraft">
            Salvar exercícios
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="evo-water-sheet">
      <div
        v-if="isEditingSleep"
        class="evo-modal-overlay evo-modal-overlay--water"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="evo-modal evo-modal--water evo-modal--sleep"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evo-sleep-modal-title"
        >
          <span class="evo-modal-handle" aria-hidden="true" />

          <header class="evo-water-sheet-head">
            <span class="evo-water-sheet-icon evo-sleep-sheet-icon" aria-hidden="true">
              <Moon />
            </span>
            <div>
              <h2 id="evo-sleep-modal-title">Sono</h2>
              <p>Ajuste seus horários e sua meta de descanso.</p>
            </div>
            <button
              ref="sleepCloseButton"
              type="button"
              class="evo-modal-close"
              aria-label="Fechar"
              @click="closeModal"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <section class="evo-water-hero evo-sleep-hero" aria-label="Resumo do sono">
            <div
              class="evo-water-ring evo-sleep-ring"
              role="progressbar"
              aria-label="Meta de sono concluída"
              :aria-valuenow="sleepProgressPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <svg viewBox="0 0 240 240" aria-hidden="true">
                <g>
                  <path
                    class="evo-water-ring-track"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                  />
                  <path
                    class="evo-water-ring-value"
                    d="M 120 32 A 88 88 0 0 1 120 208"
                    :style="{ strokeDashoffset: sleepRingDashOffset }"
                  />
                </g>
              </svg>
              <div
                class="evo-water-ring-label"
                :class="{ 'evo-water-ring-label--triple': sleepProgressPercent >= 100 }"
              >
                <strong>{{ sleepProgressPercent }}%</strong>
                <span>concluído</span>
              </div>
            </div>

            <div class="evo-water-summary evo-sleep-summary">
              <div class="evo-water-summary-today">
                <span>Hoje</span>
                <strong>{{ formatSleepDuration(sleepDurationMinutes) }}</strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Meta de sono</span>
                <strong>{{ waterTargetFormatter.format(sleepDraft.target) }}h</strong>
              </div>
              <div class="evo-water-summary-row">
                <span>Faltam</span>
                <strong>{{ formatSleepDuration(sleepRemainingMinutes) }}</strong>
              </div>
            </div>
          </section>

          <section class="evo-water-picker" aria-labelledby="evo-sleep-picker-title">
            <div class="evo-water-picker-head">
              <div>
                <h3 id="evo-sleep-picker-title">O que deseja ajustar?</h3>
                <p>{{ sleepSettingConfig.description }}</p>
              </div>
            </div>

            <div class="evo-water-value-picker">
              <button
                type="button"
                :aria-label="`Diminuir ${sleepSettingConfig.label}`"
                :disabled="!canDecreaseSleepSetting"
                @click="adjustSleepSetting(-1)"
              >
                {{ previousSleepSettingValue }}
              </button>
              <output
                aria-live="polite"
                :aria-label="`${sleepSettingConfig.label}: ${currentSleepSettingValue}`"
              >
                {{ currentSleepSettingValue }}
              </output>
              <button
                type="button"
                :aria-label="`Aumentar ${sleepSettingConfig.label}`"
                :disabled="!canIncreaseSleepSetting"
                @click="adjustSleepSetting(1)"
              >
                {{ nextSleepSettingDisplay }}
              </button>
            </div>
            <span class="evo-water-picker-unit">{{ sleepSettingConfig.unit }}</span>

            <div class="evo-water-setting-tabs" role="tablist" aria-label="Configuração do sono">
              <button
                type="button"
                role="tab"
                :aria-selected="activeSleepSetting === 'bed'"
                :class="{ 'evo-water-setting-tab--active': activeSleepSetting === 'bed' }"
                @click="activeSleepSetting = 'bed'"
              >
                <Moon aria-hidden="true" />
                Dormir
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeSleepSetting === 'wake'"
                :class="{ 'evo-water-setting-tab--active': activeSleepSetting === 'wake' }"
                @click="activeSleepSetting = 'wake'"
              >
                <Sun aria-hidden="true" />
                Acordar
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeSleepSetting === 'target'"
                :class="{ 'evo-water-setting-tab--active': activeSleepSetting === 'target' }"
                @click="activeSleepSetting = 'target'"
              >
                <Target aria-hidden="true" />
                Meta
              </button>
            </div>
            <p class="evo-water-picker-hint">Toque nos valores laterais para ajustar</p>
          </section>

          <button type="button" class="evo-water-save" @click="saveSleepDraft">
            Salvar sono
          </button>
        </div>
      </div>
    </Transition>

    <div
      v-if="(editingGoal || showAdd) && !isEditingWater && !isEditingFood && !isEditingExercise && !isEditingSleep"
      class="evo-modal-overlay"
      @click.self="closeModal"
    >
      <div class="evo-modal" role="dialog" aria-modal="true" aria-labelledby="evo-goal-modal-title">
        <h2 id="evo-goal-modal-title">{{ showAdd ? 'Nova meta' : 'Ajustar meta' }}</h2>

        <label class="evo-field">
            Nome
            <input v-model="form.label" name="goal-name" type="text" maxlength="40" autocomplete="off" />
          </label>
          <label class="evo-field">
            Meta
            <input v-model.number="form.target" name="goal-target" type="number" min="1" max="99" inputmode="numeric" autocomplete="off" />
          </label>
          <label class="evo-field">
            Unidade
            <input v-model="form.unit" name="goal-unit" type="text" maxlength="20" autocomplete="off" />
          </label>
          <label class="evo-field">
            Frequência
            <select v-model="form.frequency" name="goal-frequency" autocomplete="off">
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
import { Cookie, Droplets, Dumbbell, Minus, Moon, Plus, Sparkles, Sun, Target, X } from 'lucide-vue-next'

const {
  todaySummary,
  hydrate,
  incrementGoal,
  decrementGoal,
  setProgress,
  updateGoal,
  addGoal,
  sleepSchedule,
  setSleepSchedule,
  getFoodSelectedDays,
  toggleFoodDay,
  weekdayIndex,
} = usePatientGoals()

const {
  waterVesselSettings,
  hydrateWaterVessels,
  updateWaterVessels,
} = useWaterVesselSettings()

const showAdd = ref(false)
const editingGoal = ref(null)
const waterCloseButton = ref(null)
const foodCloseButton = ref(null)
const exerciseCloseButton = ref(null)
const sleepCloseButton = ref(null)
const activeWaterSetting = ref('target')
const activeExerciseSetting = ref('progress')
const activeSleepSetting = ref('bed')
const foodDraftDays = ref([])
const exerciseDraft = reactive({
  progress: 0,
  target: 3,
})
const sleepDraft = reactive({
  bedMinutes: 23 * 60,
  wakeMinutes: 7 * 60 + 20,
  target: 8,
})
const form = reactive({
  label: '',
  target: 1,
  unit: '',
  frequency: 'daily',
  glassMl: 250,
  bottleMl: 500,
})

const foodSelectedDays = computed(() => getFoodSelectedDays())
const todayWeekdayIndex = computed(() => weekdayIndex())
const isEditingWater = computed(() => editingGoal.value?.id === 'water')
const isEditingFood = computed(() => editingGoal.value?.id === 'food')
const isEditingExercise = computed(() => editingGoal.value?.id === 'exercise')
const isEditingSleep = computed(() => editingGoal.value?.id === 'sleep')
const isGoalModalOpen = computed(() => showAdd.value || Boolean(editingGoal.value))
const waterTargetFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const waterMlFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const WATER_RING_LENGTH = Math.PI * 88

const waterSummary = computed(() =>
  todaySummary.value.find((item) => item.goal.id === 'water'),
)
const waterCurrentMl = computed(() =>
  Math.max(0, Math.round(Number(waterSummary.value?.progress || 0) * 1000)),
)
const waterTargetMl = computed(() =>
  Math.round(clampWaterTarget(form.target) * 1000),
)
const waterRemainingMl = computed(() =>
  Math.max(0, waterTargetMl.value - waterCurrentMl.value),
)
const waterProgressPercent = computed(() => {
  if (!waterTargetMl.value) return 0
  return Math.min(100, Math.round((waterCurrentMl.value / waterTargetMl.value) * 100))
})
const waterRingDashOffset = computed(() =>
  WATER_RING_LENGTH * (1 - waterProgressPercent.value / 100),
)
const foodTargetDays = computed(() =>
  Math.max(1, Number(editingGoal.value?.target || 1)),
)
const foodProgressPercent = computed(() =>
  Math.min(100, Math.round((foodDraftDays.value.length / foodTargetDays.value) * 100)),
)
const foodRemainingDays = computed(() =>
  Math.max(0, foodTargetDays.value - foodDraftDays.value.length),
)
const foodRingDashOffset = computed(() =>
  WATER_RING_LENGTH * (1 - foodProgressPercent.value / 100),
)
const exerciseProgressPercent = computed(() => {
  if (!exerciseDraft.target) return 0
  return Math.min(100, Math.round((exerciseDraft.progress / exerciseDraft.target) * 100))
})
const exerciseRemaining = computed(() =>
  Math.max(0, exerciseDraft.target - exerciseDraft.progress),
)
const exerciseRingDashOffset = computed(() =>
  WATER_RING_LENGTH * (1 - exerciseProgressPercent.value / 100),
)
const exerciseSettingConfig = computed(() =>
  activeExerciseSetting.value === 'target'
    ? {
        field: 'target',
        label: 'meta semanal',
        description: 'Quantidade de treinos que deseja fazer por semana.',
        min: 1,
        max: 14,
      }
    : {
        field: 'progress',
        label: 'treinos realizados',
        description: 'Registre quantos treinos já realizou nesta semana.',
        min: 0,
        max: Math.max(1, exerciseDraft.target),
      },
)
const exerciseSettingValue = computed(() =>
  Number(exerciseDraft[exerciseSettingConfig.value.field]) || 0,
)
const canDecreaseExerciseSetting = computed(() =>
  exerciseSettingValue.value > exerciseSettingConfig.value.min,
)
const canIncreaseExerciseSetting = computed(() =>
  exerciseSettingValue.value < exerciseSettingConfig.value.max,
)
const previousExerciseSettingValue = computed(() =>
  canDecreaseExerciseSetting.value ? exerciseSettingValue.value - 1 : '—',
)
const nextExerciseSettingValue = computed(() =>
  canIncreaseExerciseSetting.value ? exerciseSettingValue.value + 1 : '—',
)
const sleepDurationMinutes = computed(() => {
  let duration = sleepDraft.wakeMinutes - sleepDraft.bedMinutes
  if (duration <= 0) duration += 1440
  return duration
})
const sleepProgressPercent = computed(() => {
  const targetMinutes = Math.max(1, sleepDraft.target * 60)
  return Math.min(100, Math.round((sleepDurationMinutes.value / targetMinutes) * 100))
})
const sleepRemainingMinutes = computed(() =>
  Math.max(0, Math.round(sleepDraft.target * 60 - sleepDurationMinutes.value)),
)
const sleepRingDashOffset = computed(() =>
  WATER_RING_LENGTH * (1 - sleepProgressPercent.value / 100),
)
const sleepSettingConfig = computed(() => {
  if (activeSleepSetting.value === 'wake') {
    return {
      field: 'wakeMinutes',
      label: 'horário de acordar',
      description: 'Defina o horário em que deseja começar o dia.',
      unit: 'horário',
      min: 0,
      max: 1439,
      step: 15,
    }
  }
  if (activeSleepSetting.value === 'target') {
    return {
      field: 'target',
      label: 'meta de sono',
      description: 'Escolha quantas horas deseja dormir por noite.',
      unit: 'horas',
      min: 4,
      max: 12,
      step: 0.5,
    }
  }
  return {
    field: 'bedMinutes',
    label: 'horário de dormir',
    description: 'Defina o horário em que pretende ir para a cama.',
    unit: 'horário',
    min: 0,
    max: 1439,
    step: 15,
  }
})
const sleepSettingValue = computed(() =>
  Number(sleepDraft[sleepSettingConfig.value.field]),
)
const canDecreaseSleepSetting = computed(() =>
  activeSleepSetting.value !== 'target'
    || sleepSettingValue.value > sleepSettingConfig.value.min,
)
const canIncreaseSleepSetting = computed(() =>
  activeSleepSetting.value !== 'target'
    || sleepSettingValue.value < sleepSettingConfig.value.max,
)
const currentSleepSettingValue = computed(() =>
  formatSleepSetting(sleepSettingValue.value),
)
const previousSleepSettingValue = computed(() =>
  canDecreaseSleepSetting.value
    ? formatSleepSetting(nextSleepSettingValue(-1))
    : '—',
)
const nextSleepSettingDisplay = computed(() =>
  canIncreaseSleepSetting.value
    ? formatSleepSetting(nextSleepSettingValue(1))
    : '—',
)

const activeWaterSettingConfig = computed(() => {
  if (activeWaterSetting.value === 'glass') {
    return {
      field: 'glassMl',
      label: 'volume do copo',
      description: 'Volume registrado a cada copo.',
      unit: 'ml',
      min: 100,
      max: 750,
      step: 50,
    }
  }

  if (activeWaterSetting.value === 'bottle') {
    return {
      field: 'bottleMl',
      label: 'volume da garrafa',
      description: 'Volume registrado a cada garrafa.',
      unit: 'ml',
      min: 250,
      max: 2000,
      step: 50,
    }
  }

  return {
    field: 'target',
    label: 'meta diária',
    description: 'Total que deseja beber durante o dia.',
    unit: 'L',
    min: 0.5,
    max: 6,
    step: 0.25,
  }
})

const activeWaterSettingValue = computed(() =>
  Number(form[activeWaterSettingConfig.value.field]) || activeWaterSettingConfig.value.min,
)
const activeWaterSettingLabel = computed(() => activeWaterSettingConfig.value.label)
const activeWaterSettingDescription = computed(() => activeWaterSettingConfig.value.description)
const activeWaterSettingUnit = computed(() => activeWaterSettingConfig.value.unit)
const canDecreaseWaterSetting = computed(() =>
  activeWaterSettingValue.value > activeWaterSettingConfig.value.min,
)
const canIncreaseWaterSetting = computed(() =>
  activeWaterSettingValue.value < activeWaterSettingConfig.value.max,
)
const previousWaterSettingValue = computed(() =>
  canDecreaseWaterSetting.value
    ? formatActiveWaterSetting(activeWaterSettingValue.value - activeWaterSettingConfig.value.step)
    : '—',
)
const currentWaterSettingValue = computed(() =>
  formatActiveWaterSetting(activeWaterSettingValue.value),
)
const nextWaterSettingValue = computed(() =>
  canIncreaseWaterSetting.value
    ? formatActiveWaterSetting(activeWaterSettingValue.value + activeWaterSettingConfig.value.step)
    : '—',
)

watch(isEditingWater, (isOpen) => {
  if (!isOpen) return
  nextTick(() => waterCloseButton.value?.focus())
})

watch(isEditingFood, (isOpen) => {
  if (!isOpen) return
  nextTick(() => foodCloseButton.value?.focus())
})

watch(isEditingExercise, (isOpen) => {
  if (!isOpen) return
  nextTick(() => exerciseCloseButton.value?.focus())
})

watch(isEditingSleep, (isOpen) => {
  if (!isOpen) return
  nextTick(() => sleepCloseButton.value?.focus())
})

watch(isGoalModalOpen, (isOpen) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('evo-goal-modal-open', isOpen)
})

onMounted(() => {
  hydrate()
  hydrateWaterVessels()
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('evo-goal-modal-open')
})

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
  activeWaterSetting.value = 'target'
  form.label = goal.label
  form.target = goal.target
  form.unit = goal.unit
  form.frequency = goal.frequency
  form.glassMl = waterVesselSettings.value.glassMl
  form.bottleMl = waterVesselSettings.value.bottleMl
  showAdd.value = false
}

function openGoalEditor(goal) {
  if (goal.id === 'exercise') {
    openExerciseEditor(goal, 'target')
    return
  }
  if (goal.id === 'sleep') {
    openSleepEditor(goal, 'target')
    return
  }
  openEdit(goal)
}

function openFoodEditor(goal) {
  editingGoal.value = goal
  foodDraftDays.value = [...foodSelectedDays.value]
  showAdd.value = false
}

function openExerciseEditor(goal, setting = 'progress') {
  const summary = todaySummary.value.find((item) => item.goal.id === goal.id)
  editingGoal.value = goal
  activeExerciseSetting.value = setting
  exerciseDraft.progress = Number(summary?.progress || 0)
  exerciseDraft.target = Math.max(1, Number(goal.target || 3))
  showAdd.value = false
}

function openSleepEditor(goal, setting = 'bed') {
  editingGoal.value = goal
  activeSleepSetting.value = setting
  sleepDraft.bedMinutes = Number(sleepSchedule.value?.bedMinutes ?? 23 * 60)
  sleepDraft.wakeMinutes = Number(sleepSchedule.value?.wakeMinutes ?? 7 * 60 + 20)
  sleepDraft.target = Math.max(4, Math.min(12, Number(goal.target || 8)))
  showAdd.value = false
}

function closeModal() {
  showAdd.value = false
  editingGoal.value = null
}

function toggleDraftFoodDay(dayIndex) {
  const selected = new Set(foodDraftDays.value)
  if (selected.has(dayIndex)) selected.delete(dayIndex)
  else selected.add(dayIndex)
  foodDraftDays.value = [...selected].sort((a, b) => a - b)
}

function saveFoodDraft() {
  const current = new Set(getFoodSelectedDays())
  const next = new Set(foodDraftDays.value)

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    if (current.has(dayIndex) !== next.has(dayIndex)) {
      toggleFoodDay(dayIndex)
    }
  }

  closeModal()
}

function adjustExerciseSetting(direction) {
  const config = exerciseSettingConfig.value
  const next = Math.max(
    config.min,
    Math.min(config.max, exerciseSettingValue.value + direction),
  )
  exerciseDraft[config.field] = next

  if (config.field === 'target') {
    exerciseDraft.progress = Math.min(exerciseDraft.progress, exerciseDraft.target)
  }
}

function saveExerciseDraft() {
  const goal = editingGoal.value
  if (!goal || goal.id !== 'exercise') return

  updateGoal('exercise', {
    label: goal.label,
    target: Math.max(1, Math.min(14, Number(exerciseDraft.target) || 1)),
    unit: goal.unit,
    frequency: goal.frequency,
  })
  setProgress('exercise', Math.max(0, Math.min(exerciseDraft.progress, exerciseDraft.target)))
  closeModal()
}

function nextSleepSettingValue(direction) {
  const config = sleepSettingConfig.value
  const next = sleepSettingValue.value + direction * config.step
  if (activeSleepSetting.value === 'target') {
    return Math.max(config.min, Math.min(config.max, next))
  }
  return (next + 1440) % 1440
}

function adjustSleepSetting(direction) {
  const config = sleepSettingConfig.value
  sleepDraft[config.field] = nextSleepSettingValue(direction)
}

function saveSleepDraft() {
  const goal = editingGoal.value
  if (!goal || goal.id !== 'sleep') return

  updateGoal('sleep', {
    label: goal.label,
    target: Math.max(4, Math.min(12, Number(sleepDraft.target) || 8)),
    unit: goal.unit,
    frequency: goal.frequency,
  })
  setSleepSchedule(sleepDraft.bedMinutes, sleepDraft.wakeMinutes)
  closeModal()
}

function formatClockMinutes(value) {
  const normalized = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatSleepSetting(value) {
  if (activeSleepSetting.value === 'target') {
    return waterTargetFormatter.format(Number(value) || 0)
  }
  return formatClockMinutes(value)
}

function formatSleepDuration(value) {
  const total = Math.max(0, Math.round(Number(value) || 0))
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (total < 60) return `${total} min`
  if (!minutes) return `${hours}h`
  return `${hours}h${String(minutes).padStart(2, '0')}`
}

function saveForm() {
  if (isEditingWater.value) {
    updateGoal('water', {
      label: 'Água',
      target: clampWaterTarget(form.target),
      unit: 'litros',
      frequency: 'daily',
    })
    updateWaterVessels({
      glassMl: form.glassMl,
      bottleMl: form.bottleMl,
    })
    closeModal()
    return
  }

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

function clampWaterTarget(value) {
  const rounded = Math.round((Number(value) || 2) * 4) / 4
  return Math.max(0.5, Math.min(6, rounded))
}

function clampActiveWaterSetting(value) {
  const config = activeWaterSettingConfig.value
  const stepped = Math.round(Number(value) / config.step) * config.step
  return Math.max(config.min, Math.min(config.max, stepped))
}

function adjustActiveWaterSetting(direction) {
  const config = activeWaterSettingConfig.value
  form[config.field] = clampActiveWaterSetting(
    activeWaterSettingValue.value + direction * config.step,
  )
}

function formatActiveWaterSetting(value) {
  const clamped = clampActiveWaterSetting(value)
  if (activeWaterSetting.value === 'target') {
    return waterTargetFormatter.format(clamped)
  }
  return waterMlFormatter.format(clamped)
}

function formatWaterMl(value) {
  return waterMlFormatter.format(Math.max(0, Math.round(Number(value) || 0)))
}
</script>

<style scoped>
.evo-goals {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.evo-goal-card {
  padding: 0.9rem;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
}

.evo-goal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.evo-goal-head-copy {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.evo-goal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #f4f4f5;
  flex-shrink: 0;
  color: var(--cf-text);
}

.evo-goal-card--water .evo-goal-icon {
  background: #eef6fc;
  color: #4a8fc4;
}

.evo-goal-card--food .evo-goal-icon {
  background: #f8f1ef;
  color: #9d7268;
}

.evo-goal-card--exercise .evo-goal-icon {
  background: #f0f5ee;
  color: #5f8f58;
}

.evo-goal-card--sleep .evo-goal-icon {
  background: #f1f2fa;
  color: #6b74b8;
}

.evo-goal-icon-svg {
  width: 0.95rem;
  height: 0.95rem;
  stroke-width: 1.8;
}

.evo-goal-head h3 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--cf-text);
}

.evo-goal-status {
  text-align: right;
  flex-shrink: 0;
}

.evo-goal-status strong {
  display: block;
  font-size: 1.05rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
  line-height: 1;
  color: var(--cf-text);
}

.evo-goal-status span {
  display: block;
  margin-top: 0.18rem;
  font-size: 0.58rem;
  color: #8a8a8e;
}

.evo-goal-meta {
  margin: 0.15rem 0 0;
  font-size: 0.66rem;
  line-height: 1.4;
  color: #8a8a8e;
}

.evo-goal-progress {
  height: 0.25rem;
  margin: 0.7rem 0 0;
  overflow: hidden;
  border-radius: 999px;
  background: #ededf0;
}

.evo-goal-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #8b967c;
}

.evo-goal-card--water .evo-goal-progress span {
  background: #5ba4d9;
}

.evo-goal-card--food .evo-goal-progress span {
  background: #a87d70;
}

.evo-goal-card--exercise .evo-goal-progress span {
  background: #5f8f58;
}

.evo-goal-card--sleep .evo-goal-progress span {
  background: #6b74b8;
}

.evo-goal-surface {
  margin-top: 0.75rem;
  padding: 0.8rem 0.15rem 0.2rem;
  border-top: 1px solid #ededf0;
  background: transparent;
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
  border: 1px solid #e5e5ea;
  border-radius: 50%;
  background: #fff;
  font-family: inherit;
  font-size: 1.15rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.evo-goal-btn--primary {
  border-color: var(--cf-green-dark);
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
  font-weight: 500;
  min-width: 4.5rem;
  text-align: center;
}

.evo-goal-edit {
  display: block;
  margin: 0.55rem 0 0 auto;
  padding: 0.35rem 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--cf-green-dark, #6f7863);
  cursor: pointer;
  touch-action: manipulation;
}

.evo-add-goal {
  min-height: 2.8rem;
  padding: 0.75rem 1rem;
  border: 1px dashed #cfcfd4;
  border-radius: 1rem;
  background: #fff;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--cf-green-dark, #6f7863);
  cursor: pointer;
  touch-action: manipulation;
}

.evo-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 25000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.35);
  overscroll-behavior: contain;
}

.evo-modal {
  width: 100%;
  max-width: 430px;
  padding: 1.15rem;
  border: 1px solid #e5e5ea;
  border-radius: 1rem;
  background: #fff;
}

.evo-modal-overlay--water {
  padding: 0;
  background: rgba(20, 24, 28, 0.38);
}

.evo-modal--water {
  max-height: min(88dvh, 46rem);
  overflow-y: auto;
  padding: 0.55rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  border: none;
  border-radius: 1.25rem 1.25rem 0 0;
  overscroll-behavior: contain;
}

.evo-modal-handle {
  display: block;
  width: 2.25rem;
  height: 0.25rem;
  margin: 0 auto 0.85rem;
  border-radius: 999px;
  background: #d2d2d7;
}

.evo-water-sheet-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.evo-water-sheet-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: #eef7fc;
  color: #4a96c5;
  flex-shrink: 0;
}

.evo-water-sheet-icon svg {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.8;
}

.evo-food-sheet-icon {
  background: #f8efec;
  color: #9d7268;
}

.evo-exercise-sheet-icon {
  background: #eef5ec;
  color: #5f8f58;
}

.evo-sleep-sheet-icon {
  background: #f1f2fa;
  color: #6b74b8;
}

.evo-water-sheet-head > div {
  min-width: 0;
}

.evo-water-sheet-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.evo-water-sheet-head p {
  margin: 0.15rem 0 0;
  font-size: 0.68rem;
  color: #737378;
}

.evo-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #f2f2f4;
  color: #5f5f65;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.evo-modal-close svg {
  width: 0.95rem;
  height: 0.95rem;
  stroke-width: 2;
}

.evo-water-hero {
  position: relative;
  min-height: 15.5rem;
  margin: 0 -1rem;
  overflow: hidden;
  background: #f8fbfd;
}

.evo-food-hero {
  background: #fcf9f8;
}

.evo-exercise-hero {
  background: #f8faf7;
}

.evo-sleep-hero {
  background: #f8f8fc;
}

.evo-water-ring {
  position: absolute;
  top: 0;
  left: -7.75rem;
  width: 15.5rem;
  height: 15.5rem;
}

.evo-water-ring svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.evo-water-ring path {
  fill: none;
  stroke-width: 27;
  stroke-linecap: butt;
}

.evo-water-ring-track {
  stroke: #e6e9eb;
}

.evo-water-ring-value {
  stroke: #5ba4d9;
  stroke-dasharray: 276.46;
  transition: stroke-dashoffset 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.evo-food-ring .evo-water-ring-track {
  stroke: #ebe3e0;
}

.evo-food-ring .evo-water-ring-value {
  stroke: #a87d70;
}

.evo-exercise-ring .evo-water-ring-track {
  stroke: #e3e9e1;
}

.evo-exercise-ring .evo-water-ring-value {
  stroke: #5f8f58;
}

.evo-sleep-ring .evo-water-ring-track {
  stroke: #e4e5ed;
}

.evo-sleep-ring .evo-water-ring-value {
  stroke: #6b74b8;
}

.evo-water-ring-label {
  position: absolute;
  top: 6.25rem;
  left: 8.15rem;
  width: 4.75rem;
  text-align: center;
}

.evo-water-ring-label strong,
.evo-water-ring-label span {
  display: block;
}

.evo-water-ring-label strong {
  font-size: 1.42rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.evo-water-ring-label--triple strong {
  font-size: 1.18rem;
  letter-spacing: -0.045em;
  transform: translateX(-0.58rem);
}

.evo-water-ring-label span {
  margin-top: 0.28rem;
  font-size: 0.6rem;
  color: #686d72;
}

.evo-water-summary {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
  width: 50%;
  margin-left: auto;
  padding: 1.5rem 1rem 1.25rem 0.75rem;
  text-align: right;
}

.evo-water-summary span,
.evo-water-summary strong {
  display: block;
}

.evo-water-summary-today span,
.evo-water-summary-row span {
  margin-bottom: 0.2rem;
  font-size: 0.62rem;
  color: #68737b;
}

.evo-water-summary-today strong {
  color: #438ec4;
  font-size: 1.65rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
}

.evo-food-summary .evo-water-summary-today strong {
  color: #9d7268;
}

.evo-exercise-summary .evo-water-summary-today strong {
  color: #5f8f58;
}

.evo-sleep-summary .evo-water-summary-today strong {
  color: #626bb0;
}

.evo-water-summary-today small {
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0;
}

.evo-water-summary-row strong {
  font-size: 0.86rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.evo-water-picker {
  padding-top: 1.25rem;
}

.evo-food-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1.25rem;
}

.evo-water-picker-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}

.evo-water-picker-head h3 {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 500;
  text-wrap: balance;
}

.evo-water-picker-head p {
  margin: 0.22rem 0 0;
  font-size: 0.64rem;
  color: #686d72;
}

.evo-water-setting-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.25rem;
  margin-top: 0.85rem;
  padding: 0.22rem;
  border: 1px solid #e2e2e6;
  border-radius: 0.85rem;
  background: #f4f4f6;
}

.evo-exercise-setting-tabs {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.evo-water-setting-tabs button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0.3rem 0.4rem;
  border: none;
  border-radius: 0.65rem;
  background: transparent;
  color: #6c7074;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 400;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.evo-water-setting-tabs button > svg {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.8;
}

.evo-water-setting-tabs .evo-water-setting-tab--active {
  background: #fff;
  color: #202124;
  box-shadow: 0 1px 3px rgba(18, 20, 22, 0.08);
}

.evo-modal--sleep .evo-water-setting-tab--active {
  color: #5b63a4;
}

.evo-water-setting-vessel {
  display: block;
  width: 0.9rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.evo-water-value-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(6rem, 1.15fr) minmax(0, 1fr);
  align-items: center;
  width: min(100%, 20rem);
  margin: 1.25rem auto 0;
}

.evo-water-value-picker button,
.evo-water-value-picker output {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  font-variant-numeric: tabular-nums;
}

.evo-water-value-picker button {
  padding: 0;
  border: none;
  background: transparent;
  color: #9da1a5;
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: 400;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.evo-water-value-picker button:disabled {
  color: #d2d4d6;
  cursor: default;
}

.evo-water-value-picker output {
  border-right: 1px solid #cfd9ca;
  border-left: 1px solid #cfd9ca;
  color: #1f2022;
  font-size: 1.65rem;
  font-weight: 500;
  letter-spacing: -0.03em;
}

.evo-water-picker-unit {
  display: block;
  margin-top: 0.2rem;
  color: #85898d;
  font-size: 0.62rem;
  text-align: center;
}

.evo-water-picker-hint {
  margin: 0.55rem 0 0;
  color: #85898d;
  font-size: 0.6rem;
  text-align: center;
}

.evo-water-save {
  width: 100%;
  min-height: 2.8rem;
  margin-top: 1rem;
  border: none;
  border-radius: 0.75rem;
  background: var(--cf-green-dark, #6f7863);
  color: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.evo-modal--food .evo-water-save {
  background: #8f665d;
}

.evo-modal--exercise .evo-water-save {
  background: #5f8f58;
}

.evo-modal--sleep .evo-water-save {
  background: #6b74b8;
}

@media (hover: hover) {
  .evo-modal-close:hover {
    background: #e8e8eb;
  }

  .evo-water-setting-tabs button:not(.evo-water-setting-tab--active):hover {
    background: #ebebee;
    color: #44474a;
  }

  .evo-water-value-picker button:not(:disabled):hover {
    color: #438ec4;
  }

  .evo-water-save:hover {
    background: #626b57;
  }

  .evo-modal--food .evo-water-save:hover {
    background: #7d584f;
  }

  .evo-modal--exercise .evo-water-save:hover {
    background: #527d4c;
  }

  .evo-modal--sleep .evo-water-save:hover {
    background: #5b63a4;
  }
}

.evo-water-sheet-enter-active,
.evo-water-sheet-leave-active {
  transition: background-color 0.22s ease;
}

.evo-water-sheet-enter-active .evo-modal--water,
.evo-water-sheet-leave-active .evo-modal--water {
  transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.evo-water-sheet-enter-from,
.evo-water-sheet-leave-to {
  background: rgba(20, 24, 28, 0);
}

.evo-water-sheet-enter-from .evo-modal--water,
.evo-water-sheet-leave-to .evo-modal--water {
  transform: translateY(100%);
}

.evo-modal:not(.evo-modal--water) > h2 {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
  font-weight: 600;
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
  font-weight: 500;
  color: var(--cf-text-muted);
}

.evo-field input,
.evo-field select {
  padding: 0.65rem 0.75rem;
  border: 1px solid #d8d8dc;
  border-radius: 0.7rem;
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
  border-radius: 0.7rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
}

.evo-modal-cancel {
  border: 1px solid #d8d8dc;
  background: #fff;
}

.evo-modal-save {
  border: none;
  background: var(--cf-green-dark);
  color: #fff;
}

.evo-goal-btn:focus-visible,
.evo-goal-edit:focus-visible,
.evo-add-goal:focus-visible,
.evo-modal-cancel:focus-visible,
.evo-modal-save:focus-visible,
.evo-modal-close:focus-visible,
.evo-water-setting-tabs button:focus-visible,
.evo-water-value-picker button:focus-visible,
.evo-water-save:focus-visible,
.evo-field input:focus-visible,
.evo-field select:focus-visible {
  outline: 2px solid var(--cf-green-dark, #6f7863);
  outline-offset: 2px;
}

.evo-goal-edit:active,
.evo-add-goal:active,
.evo-water-setting-tabs button:active,
.evo-water-value-picker button:not(:disabled):active,
.evo-water-save:active {
  opacity: 0.7;
}

.evo-goal-card :deep(.exercise-track__stat strong),
.evo-goal-card :deep(.sleep-clock__duration) {
  font-weight: 500;
}

.evo-goal-card :deep(.exercise-track__btn--ghost) {
  border: 1px solid #e5e5ea;
  box-shadow: none;
}

.evo-goal-card :deep(.exercise-track__btn--primary) {
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .evo-goal-progress span,
  .evo-water-ring-value {
    transition: none;
  }

  .evo-water-sheet-enter-active,
  .evo-water-sheet-leave-active,
  .evo-water-sheet-enter-active .evo-modal--water,
  .evo-water-sheet-leave-active .evo-modal--water {
    transition: none;
  }
}
</style>
