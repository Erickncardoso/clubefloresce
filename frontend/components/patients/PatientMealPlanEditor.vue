<template>
  <div class="mped" :class="{ 'mped--sheet': inSheet }">
    <header v-if="!inSheet" class="mped-head">
      <div class="mped-head-copy">
        <div class="mped-patient">
          <PatientAvatar :src="user?.avatar" :name="user?.name" :user="user" size="sm" :ring="false" />
          <div>
            <strong>{{ form.title || 'Nova prescrição' }}</strong>
            <p>
              {{ methodologyLabel(form.methodology) }}
              <span v-if="form.status"> · {{ statusLabel(form.status) }}</span>
            </p>
          </div>
        </div>
      </div>
      <div class="mped-head-actions">
        <button type="button" class="btn-secondary mped-btn" @click="$emit('open-history')">
          Histórico de planos
        </button>
        <button type="button" class="btn-primary mped-btn" @click="$emit('new-plan')">
          Nova prescrição
        </button>
      </div>
    </header>

    <div class="mped-layout">
      <section class="mped-main">
        <div class="mped-config">
          <div class="field field--float">
            <label for="mped-diet">Tipo de dieta</label>
            <SharedCfSelect
              id="mped-diet"
              v-model="form.dietType"
              :options="dietTypeOptions"
              placeholder="Selecione"
            />
          </div>
          <div class="field field--float">
            <label for="mped-objective">Objetivo</label>
            <input id="mped-objective" v-model="form.objective" type="text" maxlength="200" placeholder="Ex.: Emagrecimento">
          </div>
          <div class="field field--float">
            <label for="mped-start">Início</label>
            <SharedCfDateInput id="mped-start" v-model="form.startDate" />
          </div>
          <div class="mped-config-end">
            <div class="field field--float" :class="{ 'mped-field--disabled': form.indefinite }">
              <label for="mped-end">Término</label>
              <SharedCfDateInput id="mped-end" v-model="form.endDate" :disabled="form.indefinite" />
            </div>
            <label class="mped-check">
              <input v-model="form.indefinite" type="checkbox">
              <span>Sem data de término</span>
            </label>
          </div>
        </div>

        <div v-if="form.methodology === 'qualitative'" class="mped-qualitative">
          <div class="mped-qualitative-tools">
            <button type="button" class="btn-secondary mped-btn-sm" @click="qualitativeTemplatesOpen = true">
              Biblioteca de modelos
            </button>
            <button type="button" class="btn-secondary mped-btn-sm" @click="qualitativeSaveTemplateOpen = true">
              Salvar como modelo
            </button>
            <p v-if="qualitativeTemplateNotice" class="mped-qualitative-notice">{{ qualitativeTemplateNotice }}</p>
          </div>
          <div class="mped-legend">
            <span><strong>!</strong> Suplementos</span>
            <span><strong>@</strong> Grupo de alimentos</span>
            <span><strong>$</strong> Receitas</span>
            <span><strong>#</strong> Observação</span>
            <small>Ctrl + Enter para salvar rascunho</small>
          </div>
          <div class="mped-qualitative-editor">
            <PatientAnamneseRichEditor
              v-model="form.editorHtml"
              :placeholder="QUALITATIVE_PLACEHOLDER"
              aria-label="Prescrição qualitativa"
            />
          </div>
          <div class="field field--float mped-notes-wrap">
            <label for="mped-notes">Anotações finais</label>
            <textarea id="mped-notes" v-model="form.finalNotes" rows="3" maxlength="8000" placeholder="Orientações gerais para o paciente" />
          </div>
        </div>

        <div v-else class="mped-meals">
          <div class="mped-toolbar">
            <div class="mped-toolbar__block">
              <span class="mped-toolbar__label">Dias da semana</span>
              <div class="mped-day-pills">
                <button
                  v-for="day in WEEK_DAYS"
                  :key="day.id"
                  type="button"
                  class="mped-day-pill"
                  :class="{ 'mped-day-pill--active': activeDay === day.id }"
                  @click="onDayPillClick(day.id)"
                >
                  {{ day.label }}
                </button>
              </div>
            </div>
            <div class="mped-meals-tools">
              <button type="button" class="btn-secondary mped-btn-sm" @click="expandAll = !expandAll">
                {{ expandAll ? 'Recolher tudo' : 'Expandir tudo' }}
              </button>
              <button type="button" class="btn-secondary mped-btn-sm" @click="sortByTime">
                Reordenar por horário
              </button>
            </div>
          </div>

          <p v-if="form.methodology === 'equivalents'" class="mped-meals-hint">
            <Info class="mped-meals-hint__icon" aria-hidden="true" />
            <span>Prescreva porções de grupos alimentares e liste as opções de substituição para o paciente escolher.</span>
          </p>

          <PatientMealPlanLiveMacroBar
            v-if="form.methodology === 'foods'"
            :totals="liveNutritionTotals"
          />

          <div class="mped-meal-list">
            <article v-for="(meal, mealIndex) in form.meals" :key="meal.id" class="mped-meal">
              <header class="mped-meal-header">
                <button
                  type="button"
                  class="mped-meal-header__chevron"
                  :aria-expanded="isExpanded(meal.id)"
                  @click="toggleMeal(meal.id)"
                >
                  <ChevronDown :class="{ 'mped-chevron--open': isExpanded(meal.id) }" />
                </button>
                <div class="mped-meal-header__title">
                  <SharedCfTimeInput
                    v-model="meal.time"
                    compact
                    :minute-step="5"
                    aria-label="Horário da refeição"
                  />
                  <span class="mped-meal-header__sep">·</span>
                  <input
                    v-model="meal.label"
                    type="text"
                    class="mped-meal-name mped-meal-name--header"
                    placeholder="Nome da refeição"
                    maxlength="120"
                  >
                </div>
                <div v-if="form.methodology === 'foods'" class="mped-meal-header__chips">
                  <span
                    v-for="chip in mealMacroSummary(meal).chips"
                    :key="chip.id"
                    class="mped-chip"
                    :class="`mped-chip--${chip.tone}`"
                  >
                    {{ chip.label }} {{ formatMacroGrams(mealMacros(meal)[chip.key]) }}
                    <small v-if="chip.percent">({{ chip.percent }}%)</small>
                  </span>
                  <span class="mped-chip mped-chip--kcal">{{ formatMacroKcal(mealMacros(meal).caloriesKcal) }}</span>
                </div>
                <div class="mped-meal-header__actions">
                  <button type="button" class="mped-icon-btn cf-squircle cf-squircle--icon" title="Duplicar" @click="duplicateMeal(mealIndex)">
                    <Copy />
                  </button>
                  <button type="button" class="mped-icon-btn mped-icon-btn--danger cf-squircle cf-squircle--icon" title="Excluir" @click="removeMeal(mealIndex)">
                    <Trash2 />
                  </button>
                </div>
              </header>

              <div v-if="isExpanded(meal.id)" class="mped-meal-body">
                <template v-if="form.methodology === 'equivalents'">
                  <div v-for="(item, itemIndex) in meal.items" :key="item.id" class="mped-equiv-row">
                    <select
                      :value="item.groupId"
                      class="mped-equiv-group mped-inline-input"
                      aria-label="Grupo alimentar"
                      @change="onEquivalentGroupChange(item, $event.target.value)"
                    >
                      <option v-for="group in FOOD_EQUIVALENT_GROUPS" :key="group.id" :value="group.id">
                        {{ group.label }}
                      </option>
                    </select>
                    <input
                      v-model="item.amount"
                      type="text"
                      class="mped-food-qty mped-inline-input"
                      placeholder="Qtd"
                      @input="syncEquivalentUnit(item)"
                    >
                    <span class="mped-equiv-unit">{{ item.unit || 'porção' }}</span>
                    <input
                      v-model="item.options"
                      type="text"
                      class="mped-equiv-options mped-inline-input"
                      placeholder="Opções (ex.: arroz, batata doce)"
                    >
                    <button type="button" class="mped-icon-btn mped-icon-btn--danger cf-squircle cf-squircle--icon" @click="removeFood(mealIndex, itemIndex)">
                      <Trash2 />
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="mped-food-grid">
                    <div class="mped-food-grid__head">
                      <span>Alimento</span>
                      <span>Medida</span>
                      <span class="mped-food-grid__macro">CHO</span>
                      <span class="mped-food-grid__macro">PTN</span>
                      <span class="mped-food-grid__macro">LIP</span>
                      <span class="mped-food-grid__kcal">Energia</span>
                      <span class="mped-food-grid__actions" aria-hidden="true" />
                    </div>

                    <div
                      v-for="(item, itemIndex) in meal.items"
                      :key="item.id"
                      class="mped-food-grid__row-wrap"
                      :class="{
                        'mped-food-grid__row-wrap--editing': editingItemId === item.id,
                        'mped-food-grid__row-wrap--recipe': isRecipeMealItem(item),
                      }"
                    >
                      <div
                        class="mped-food-grid__row"
                        :class="{ 'mped-food-grid__row--editing': editingItemId === item.id }"
                      >
                        <div class="mped-food-grid__food">
                          <MealPlanFoodSearchPicker
                            v-if="editingItemId === item.id && !isRecipeMealItem(item)"
                            v-model="item.name"
                            @select="onFoodPickerSelect(item, $event)"
                            @recipe-trigger="onRecipePickerTrigger(mealIndex, item)"
                          />
                          <button
                            v-else-if="isRecipeMealItem(item)"
                            type="button"
                            class="mped-food-grid__text mped-food-grid__text--recipe"
                            @click="editRecipeItem(item, mealIndex)"
                          >
                            <ChefHat aria-hidden="true" />
                            <span>{{ recipeDisplayLabel(item) }}</span>
                            <small v-if="recipeIngredientsMissingCount(item)" class="mped-food-link mped-food-link--warn">
                              {{ recipeIngredientsMissingCount(item) }} ingrediente(s) sem macro
                            </small>
                          </button>
                          <button
                            v-else
                            type="button"
                            class="mped-food-grid__text"
                            @click="startEditItem(item)"
                          >
                            <span>{{ item.name || 'Alimento' }}</span>
                            <small
                              v-if="item.linkedFoodName && item.linkedFoodName !== item.name"
                              class="mped-food-link"
                            >TBCA: {{ item.linkedFoodName }}</small>
                            <small v-else-if="!item.per100g?.caloriesKcal" class="mped-food-link mped-food-link--warn">Sem vínculo TBCA</small>
                          </button>
                        </div>

                        <div class="mped-food-grid__measure">
                          <MealPlanPortionMeasurePicker
                            v-if="editingItemId === item.id && !isRecipeMealItem(item)"
                            :food-name="item.name"
                            :food-source="item.foodSource"
                            :per100g="item.per100g"
                            :nutrients-per100g="item.nutrientsPer100g"
                            :amount="Number(item.portionAmount) || 1"
                            :measure-id="item.portionMeasure || 'unidade'"
                            @change="onPortionChange(item, $event)"
                          />
                          <button
                            v-else-if="isRecipeMealItem(item)"
                            type="button"
                            class="mped-food-grid__text mped-food-grid__text--muted"
                            @click="editRecipeItem(item, mealIndex)"
                          >
                            {{ item.recipeSnapshot?.servingsLabel || item.servingLabel || '1 porção' }}
                          </button>
                          <button
                            v-else
                            type="button"
                            class="mped-food-grid__text mped-food-grid__text--muted"
                            @click="startEditItem(item)"
                          >
                            {{ foodItemPortionLabel(item) || '—' }}
                          </button>
                        </div>

                        <span class="mped-food-grid__macro mped-food-grid__macro--c">{{ formatItemMacro(item, 'carbsG') }}</span>
                        <span class="mped-food-grid__macro mped-food-grid__macro--p">{{ formatItemMacro(item, 'proteinG') }}</span>
                        <span class="mped-food-grid__macro mped-food-grid__macro--f">{{ formatItemMacro(item, 'fatG') }}</span>
                        <span class="mped-food-grid__kcal">{{ formatItemMacro(item, 'caloriesKcal', true) }}</span>

                        <div class="mped-food-grid__actions">
                          <button
                            v-if="editingItemId === item.id"
                            type="button"
                            class="mped-line-done"
                            @click="finishEditItem(item, mealIndex, itemIndex)"
                          >
                            OK
                          </button>
                          <template v-else>
                            <button
                              type="button"
                              class="mped-subs-link"
                              :class="{ 'mped-subs-link--active': expandedSubs.has(item.id) }"
                              :title="substitutionButtonTitle(item)"
                              @click="toggleSubstitutions(item.id)"
                            >
                              <ArrowLeftRight aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              class="mped-icon-btn mped-icon-btn--danger cf-squircle cf-squircle--icon"
                              title="Excluir alimento"
                              @click="removeFood(mealIndex, itemIndex)"
                            >
                              <Trash2 />
                            </button>
                          </template>
                        </div>
                      </div>

                      <div class="mped-food-inline-macros" aria-label="Macronutrientes do alimento">
                        <span class="mped-chip mped-chip--c">CHO {{ formatItemMacro(item, 'carbsG') }}</span>
                        <span class="mped-chip mped-chip--p">PTN {{ formatItemMacro(item, 'proteinG') }}</span>
                        <span class="mped-chip mped-chip--f">LIP {{ formatItemMacro(item, 'fatG') }}</span>
                        <span class="mped-chip mped-chip--kcal">{{ formatItemMacro(item, 'caloriesKcal', true) }}</span>
                      </div>

                      <div v-if="expandedSubs.has(item.id)" class="mped-subs-panel">
                        <MealPlanItemSubstitutionsPanel
                          :item="item"
                          @change="onSubstitutionsChange(item)"
                        />
                      </div>
                    </div>
                  </div>

                  <div v-if="meal.items.length" class="mped-meal-macros-bar">
                    <span class="mped-meal-macros-bar__title">Total da refeição</span>
                    <div class="mped-meal-macros-bar__chips">
                      <span
                        v-for="chip in mealMacroSummary(meal).chips"
                        :key="chip.id"
                        class="mped-chip"
                        :class="`mped-chip--${chip.tone}`"
                      >
                        {{ chip.label }} {{ formatMacroGrams(mealMacros(meal)[chip.key]) }}
                        <small v-if="chip.percent">({{ chip.percent }}%)</small>
                      </span>
                      <span class="mped-chip mped-chip--kcal">{{ formatMacroKcal(mealMacros(meal).caloriesKcal) }}</span>
                    </div>
                  </div>
                </template>
                <div class="mped-meal-body__actions">
                  <p v-if="!meal.items.length" class="mped-meal-empty">
                    <UtensilsCrossed aria-hidden="true" />
                    <span>
                      {{ form.methodology === 'equivalents'
                        ? 'Nenhum equivalente nesta refeição ainda.'
                        : 'Nenhum alimento nesta refeição ainda.' }}
                    </span>
                  </p>

                  <div class="mped-meal-add">
                    <button type="button" class="mped-add-food" @click="addFood(mealIndex)">
                      <Plus aria-hidden="true" />
                      {{ form.methodology === 'equivalents' ? 'Adicionar equivalente' : 'Adicionar alimento' }}
                    </button>
                    <button
                      v-if="form.methodology === 'foods'"
                      type="button"
                      class="mped-add-food mped-add-food--recipe"
                      @click="addRecipe(mealIndex)"
                    >
                      <ChefHat aria-hidden="true" />
                      Inserir receita
                    </button>
                  </div>

                  <button
                    v-if="!isNotesOpen(meal)"
                    type="button"
                    class="mped-notes-toggle"
                    @click="openMealNotes(meal.id)"
                  >
                    <MessageSquarePlus aria-hidden="true" />
                    Adicionar observações da refeição
                  </button>
                  <div v-else class="field field--float mped-meal-notes">
                    <label :for="`mped-meal-notes-${meal.id}`">Observações da refeição</label>
                    <textarea
                      :id="`mped-meal-notes-${meal.id}`"
                      :ref="(el) => registerNotesRef(meal.id, el)"
                      v-model="meal.notes"
                      rows="2"
                      placeholder="Orientações específicas desta refeição"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          <button type="button" class="mped-new-meal" @click="addMeal">
            <Plus aria-hidden="true" />
            Adicionar refeição
          </button>
        </div>
      </section>

      <aside class="mped-sidebar">
        <div class="mped-sidebar-nutrition">
          <PatientMealPlanNutritionSummary
            :report="nutritionReport"
            :loading="enrichingFoods ? enrichProgress : ''"
            :pdf-loading="nutritionSummaryPdfLoading"
            @open-full="openNutritionFull"
            @open-goals="nutritionGoalsOpen = true"
            @open-hydration="hydrationFullOpen = true"
            @export-pdf="exportNutritionSummaryPdf"
          />

          <PatientMealPlanHydrationCard
            :prescription="form.hydrationPrescription"
            :feedback="hydrationFeedback"
            @open-full="hydrationFullOpen = true"
            @edit-prescription="hydrationOpen = true"
          />
        </div>

        <div class="mped-sidebar-body">
          <PatientMealPlanShoppingListCard
            :title="normalizedShoppingList.title"
            :items="shoppingListItems"
            @edit="shoppingListOpen = true"
            @smart="openShoppingListSmart"
          />

          <article v-if="restrictionsText" class="mped-side-card mped-side-card--muted">
            <h4>Restrições</h4>
            <p>{{ restrictionsText }}</p>
          </article>
        </div>

          <PatientMealPlanNutritionFullModal
            v-model:open="nutritionFullOpen"
            :goals-adjacent="nutritionGoalsOpen"
            :report="nutritionReport"
            :meals="form.meals"
            :meal-rows="mealNutritionRows"
            :food-composition="faithfulFoodComposition.rows"
            :pdf-report="hasFaithfulPdfReport ? faithfulPdfReport : null"
            :print-context="nutritionPrintContext"
          />

          <PatientMealPlanNutritionGoalsModal
            v-model:open="nutritionGoalsOpen"
            :docked="nutritionFullOpen"
            :goals="form.nutritionTotals"
            :live-totals="liveNutritionTotals"
            :profile-defaults="hydrationProfileDefaults"
            @save="saveNutritionGoals"
            @open-full="openNutritionFullFromGoals"
          />

          <PatientMealPlanShoppingListModal
            v-model:open="shoppingListOpen"
            :shopping-list="form.shoppingList"
            :meals="form.meals"
            :methodology="form.methodology"
            :plan-title="form.title"
            :auto-smart="shoppingListAutoSmart"
            @save="saveShoppingList"
          />

          <PatientMealPlanHydrationModal
            v-model:open="hydrationOpen"
            :prescription="form.hydrationPrescription"
            :profile-defaults="hydrationProfileDefaults"
            :plan-title="form.title"
            @save="saveHydrationPrescription"
          />

          <PatientMealPlanHydrationFullModal
            v-model:open="hydrationFullOpen"
            :prescription="form.hydrationPrescription"
            :logs="hydrationLogs"
            :feedback="hydrationFeedback"
            @edit-prescription="openHydrationPrescriptionFromFull"
            @mark-feedback-read="saveHydrationFeedbackRead"
          />

        <footer class="mped-sidebar-footer">
          <p v-if="localDraftLabel" class="mped-local-draft">{{ localDraftLabel }}</p>
          <p v-if="saveMessage" class="mped-save-msg" :class="{ 'mped-save-msg--error': saveError }">
            {{ saveMessage }}
          </p>
          <div class="mped-sidebar-footer__actions">
            <button type="button" class="btn-secondary mped-btn mped-sidebar-btn" :disabled="saving" @click="saveDraft">
              {{ saving ? 'Salvando…' : 'Salvar rascunho' }}
            </button>
            <button type="button" class="btn-primary mped-btn mped-sidebar-btn" :disabled="saving || publishing" @click="publishPlan">
              {{ publishing ? 'Publicando…' : 'Salvar e publicar' }}
            </button>
          </div>
        </footer>
      </aside>
    </div>

    <PatientMealPlanDaySelectConfirmModal
      v-model:open="daySelectConfirmOpen"
      @confirm="confirmDaySwitch"
      @cancel="cancelDaySwitch"
    />

    <MealPlanRecipeEditorModal
      v-if="recipeEditorOpen"
      :recipe="recipeEditorSeed"
      :patients="patientOptions"
      @close="closeRecipeEditor"
      @saved="onRecipeSaved"
      @insert="onRecipeInserted"
    />

    <PatientMealPlanQualitativeTemplatesModal
      v-model:open="qualitativeTemplatesOpen"
      @apply="onQualitativeTemplateApply"
    />

    <PatientMealPlanSaveQualitativeTemplateModal
      v-model:open="qualitativeSaveTemplateOpen"
      :editor-html="form.editorHtml"
      :final-notes="form.finalNotes"
      :default-name="form.title"
      @saved="onQualitativeTemplateSaved"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  ArrowLeftRight,
  ChefHat,
  ChevronDown,
  Copy,
  Info,
  MessageSquarePlus,
  Plus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-vue-next'
import MealPlanFoodSearchPicker from '~/components/patients/MealPlanFoodSearchPicker.vue'
import MealPlanPortionMeasurePicker from '~/components/patients/MealPlanPortionMeasurePicker.vue'
import MealPlanItemSubstitutionsPanel from '~/components/patients/MealPlanItemSubstitutionsPanel.vue'
import MealPlanRecipeEditorModal from '~/components/patients/MealPlanRecipeEditorModal.vue'
import PatientMealPlanNutritionSummary from '~/components/patients/PatientMealPlanNutritionSummary.vue'
import PatientMealPlanLiveMacroBar from '~/components/patients/PatientMealPlanLiveMacroBar.vue'
import PatientMealPlanNutritionFullModal from '~/components/patients/PatientMealPlanNutritionFullModal.vue'
import PatientMealPlanNutritionGoalsModal from '~/components/patients/PatientMealPlanNutritionGoalsModal.vue'
import PatientMealPlanHydrationModal from '~/components/patients/PatientMealPlanHydrationModal.vue'
import PatientMealPlanHydrationCard from '~/components/patients/PatientMealPlanHydrationCard.vue'
import PatientMealPlanHydrationFullModal from '~/components/patients/PatientMealPlanHydrationFullModal.vue'
import PatientMealPlanShoppingListCard from '~/components/patients/PatientMealPlanShoppingListCard.vue'
import PatientMealPlanShoppingListModal from '~/components/patients/PatientMealPlanShoppingListModal.vue'
import PatientMealPlanDaySelectConfirmModal from '~/components/patients/PatientMealPlanDaySelectConfirmModal.vue'
import PatientAnamneseRichEditor from '~/components/patients/PatientAnamneseRichEditor.vue'
import PatientMealPlanQualitativeTemplatesModal from '~/components/patients/PatientMealPlanQualitativeTemplatesModal.vue'
import PatientMealPlanSaveQualitativeTemplateModal from '~/components/patients/PatientMealPlanSaveQualitativeTemplateModal.vue'
import { extractNutrientsPer100gFromFood } from '~/utils/food-bank.js'
import { buildMealPlanNutritionReport } from '~/utils/meal-plan-nutrition-report.js'
import { buildMealMacroSummary } from '~/utils/meal-plan-live-macros.js'
import {
  buildShoppingListItems,
  normalizeShoppingList,
} from '~/utils/meal-plan-shopping-list.js'
import {
  FOOD_EQUIVALENT_GROUPS,
  MEAL_PLAN_DIET_TYPES,
  QUALITATIVE_PLACEHOLDER,
  buildFaithfulFoodCompositionRows,
  buildFaithfulPdfReportRows,
  collectRestrictions,
  computeFoodItemMacros,
  createEmptyMealItem,
  applyFoodItemMeasure,
  sumMealItemsMacros,
  createEmptyPrescription,
  enrichPrescriptionFoodItems,
  findEquivalentGroup,
  foodItemPortionLabel,
  formatMacroGrams,
  formatMacroKcal,
  formatPortionUnit,
  hydratePrescriptionFromRecord,
  methodologyLabel,
  normalizeFoodEditorItem,
  parseSubstitutionList,
  resolvedMealMacros,
  statusLabel,
  syncItemSubstitutionOptions,
} from '~/utils/meal-plan-prescription.js'
import { syncQualitativeEditorContent, hasQualitativeContent } from '~/utils/meal-plan-qualitative-html.js'
import { applyQualitativeTemplate } from '~/utils/meal-plan-qualitative-templates.js'
import { countSubstitutionsByType } from '~/utils/meal-plan-substitutions.js'
import { useFoodBank } from '~/composables/useFoodBank.js'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import { openMealPlanNutritionSummaryPdfInNewTab } from '~/utils/meal-plan-nutrition-summary-pdf.js'
import {
  applyRecipeToMealItem,
  createEmptyRecipeMealItem,
  isRecipeMealItem,
  recipeDisplayLabel,
  recipeIngredientsMissingData,
} from '~/utils/meal-plan-recipes.js'
import {
  clearMealPlanLocalDraft,
  formatMealPlanDraftSavedAt,
  loadMealPlanLocalDraft,
  mealPlanDraftFormsEqual,
  saveMealPlanLocalDraft,
  serializeMealPlanForm,
} from '~/utils/meal-plan-local-draft.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  prescription: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  publishing: { type: Boolean, default: false },
  saveMessage: { type: String, default: '' },
  saveError: { type: Boolean, default: false },
  inSheet: { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'publish', 'open-history', 'new-plan'])

const { matchFoodForMealPlan, matchFoodBatchForMealPlan } = useFoodBank()
const { verifiedUser } = useAuthSession()
const enrichingFoods = ref(false)
const enrichProgress = ref('')
const nutritionFullOpen = ref(false)
const nutritionGoalsOpen = ref(false)
const nutritionSummaryPdfLoading = ref(false)
const hydrationOpen = ref(false)
const hydrationFullOpen = ref(false)
const shoppingListOpen = ref(false)
const shoppingListAutoSmart = ref(false)
const qualitativeTemplatesOpen = ref(false)
const qualitativeSaveTemplateOpen = ref(false)

function openNutritionFull() {
  nutritionFullOpen.value = true
}

function openNutritionFullFromGoals() {
  nutritionFullOpen.value = true
}

async function exportNutritionSummaryPdf() {
  if (nutritionSummaryPdfLoading.value) return

  const nutritionistName = String(verifiedUser.value?.name || verifiedUser.value?.fullName || '').trim()
  nutritionSummaryPdfLoading.value = true
  try {
    await openMealPlanNutritionSummaryPdfInNewTab({
      printContext: nutritionPrintContext.value,
      macros: liveNutritionTotals.value,
      percents: nutritionReport.value.percents,
      mealRows: mealNutritionRows.value,
      nutritionistName: nutritionistName ? `Nutricionista ${nutritionistName}` : 'Nutricionista',
    })
  } catch (error) {
    console.error('[mped] Falha ao gerar PDF do resumo nutricional', error)
  } finally {
    nutritionSummaryPdfLoading.value = false
  }
}

function saveNutritionGoals(goals) {
  form.nutritionTotals = { ...goals }
  form.pdfNutritionTotals = { ...goals }
}

function saveHydrationPrescription(prescription) {
  form.hydrationPrescription = prescription
}

function openHydrationPrescriptionFromFull() {
  hydrationFullOpen.value = false
  hydrationOpen.value = true
}

const hydrationFeedbackLocal = ref([])

watch(
  () => props.user?.patientProfileData?.hydrationFeedback ?? props.profile?.hydrationFeedback,
  (items) => {
    hydrationFeedbackLocal.value = Array.isArray(items) ? [...items] : []
  },
  { immediate: true, deep: true },
)

const hydrationLogs = computed(() => {
  const fromUser = props.user?.patientProfileData?.hydrationLogs
  const fromProfile = props.profile?.hydrationLogs
  return Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
})

const hydrationFeedback = computed(() => (
  hydrationFeedbackLocal.value.length
    ? hydrationFeedbackLocal.value
    : (Array.isArray(props.user?.patientProfileData?.hydrationFeedback)
      ? props.user.patientProfileData.hydrationFeedback
      : (Array.isArray(props.profile?.hydrationFeedback) ? props.profile.hydrationFeedback : []))
))

async function saveHydrationFeedbackRead(nextFeedback) {
  if (!Array.isArray(nextFeedback)) return
  hydrationFeedbackLocal.value = [...nextFeedback]
  if (!props.user?.id) return
  try {
    await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
      method: 'PATCH',
      body: {
        patientProfile: {
          hydrationFeedback: nextFeedback,
        },
      },
    }))
  } catch {
    /* leitura local permanece na sessão */
  }
}

function saveShoppingList(shoppingList) {
  form.shoppingList = shoppingList
}

function openShoppingListSmart() {
  shoppingListAutoSmart.value = true
  shoppingListOpen.value = true
}

watch(shoppingListOpen, (isOpen) => {
  if (!isOpen) shoppingListAutoSmart.value = false
})

function onQualitativeTemplateApply(template) {
  const hasContent = hasQualitativeContent(form)
  let mode = 'replace'
  if (hasContent) {
    const replace = confirm(
      'Aplicar este modelo substituindo o texto atual?\n\n'
      + 'OK = substituir · Cancelar = anexar ao final',
    )
    mode = replace ? 'replace' : 'append'
  }
  applyQualitativeTemplate(form, template, { mode })
}

function onQualitativeTemplateSaved() {
  qualitativeTemplateNotice.value = 'Modelo salvo na biblioteca.'
}

const qualitativeTemplateNotice = ref('')

const hydrationProfileDefaults = computed(() => ({
  weightKg: props.profile?.weightKg ?? props.profile?.anthropometry?.weightKg ?? null,
  heightCm: props.profile?.heightCm ?? props.profile?.anthropometry?.heightCm ?? null,
}))

const expandAll = ref(true)
const expandedMeals = ref(new Set())
const expandedSubs = ref(new Set())
const openNotesMeals = ref(new Set())
const notesRefs = new Map()
const editingItemId = ref('')
const recipeEditorOpen = ref(false)
const recipeEditorSeed = ref(null)
const recipeTarget = ref({ mealIndex: -1, item: null })
const patientOptions = ref([])
const apiBase = useApiBase()
const activeDay = ref('all')
const daySelectConfirmOpen = ref(false)
const pendingDayId = ref('')

function onDayPillClick(dayId) {
  if (dayId === activeDay.value) return
  if (dayId === 'all') {
    activeDay.value = 'all'
    return
  }
  if (activeDay.value === 'all') {
    pendingDayId.value = dayId
    daySelectConfirmOpen.value = true
    return
  }
  activeDay.value = dayId
}

function confirmDaySwitch() {
  if (pendingDayId.value) {
    activeDay.value = pendingDayId.value
  }
  pendingDayId.value = ''
}

function cancelDaySwitch() {
  pendingDayId.value = ''
}

const WEEK_DAYS = [
  { id: 'all', label: 'Todos os dias' },
  { id: 'mon', label: 'Segunda' },
  { id: 'tue', label: 'Terça' },
  { id: 'wed', label: 'Quarta' },
  { id: 'thu', label: 'Quinta' },
  { id: 'fri', label: 'Sexta' },
  { id: 'sat', label: 'Sábado' },
  { id: 'sun', label: 'Domingo' },
]

const dietTypeOptions = computed(() => [
  { value: '', label: 'Selecione' },
  ...MEAL_PLAN_DIET_TYPES.map((type) => ({ value: type, label: type })),
])

const prescriptionSyncKey = computed(() => props.prescription?.id ?? 'new')

const draftPlanKey = computed(() => props.prescription?.id || 'new')
const patientId = computed(() => props.user?.id || '')

const form = reactive(createEmptyPrescription())

let baselineSnapshot = ''
let suppressDraftSave = false
let draftSaveTimer = null

const localDraftSavedAt = ref('')
const hasUnsavedChanges = ref(false)

const localDraftLabel = computed(() => {
  if (!localDraftSavedAt.value) return ''
  const when = formatMealPlanDraftSavedAt(localDraftSavedAt.value)
  return when ? `Rascunho local · ${when}` : ''
})

function captureBaselineFromForm() {
  baselineSnapshot = JSON.stringify(serializeMealPlanForm(form))
  syncUnsavedChanges()
}

function captureBaselineFromPrescription() {
  baselineSnapshot = JSON.stringify(serializeMealPlanForm(hydratePrescriptionFromRecord(props.prescription)))
  syncUnsavedChanges()
}

function syncUnsavedChanges() {
  hasUnsavedChanges.value = JSON.stringify(serializeMealPlanForm(form)) !== baselineSnapshot
}

function scheduleLocalDraftSave() {
  if (!import.meta.client || suppressDraftSave || !patientId.value) return
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
  draftSaveTimer = setTimeout(() => {
    const savedAt = saveMealPlanLocalDraft(patientId.value, draftPlanKey.value, form, {
      serverUpdatedAt: props.prescription?.updatedAt || null,
    })
    if (savedAt) localDraftSavedAt.value = savedAt
  }, 1200)
}

function confirmLeave() {
  syncUnsavedChanges()
  if (!hasUnsavedChanges.value) return true
  return confirm(
    'Você tem alterações não salvas neste plano. Deseja sair mesmo assim?\n\n'
    + 'Seu progresso continua guardado como rascunho local neste dispositivo.',
  )
}

async function initEditorFromPrescription() {
  suppressDraftSave = true
  try {
    hydrateFormFromPrescription()

    let restoredFromLocal = false
    const serverForm = hydratePrescriptionFromRecord(props.prescription)
    const localDraft = loadMealPlanLocalDraft(patientId.value, draftPlanKey.value)

    if (localDraft?.form && !mealPlanDraftFormsEqual(localDraft.form, serverForm)) {
      const when = formatMealPlanDraftSavedAt(localDraft.savedAt)
      const message = when
        ? `Encontramos um rascunho local de ${when} com alterações não salvas no servidor. Deseja restaurar o que você estava editando?`
        : 'Encontramos um rascunho local com alterações não salvas no servidor. Deseja restaurar o que você estava editando?'
      if (confirm(message)) {
        Object.assign(form, hydratePrescriptionFromRecord(localDraft.form))
        expandedMeals.value = new Set((form.meals || []).map((meal) => meal.id))
        expandedSubs.value = new Set()
        editingItemId.value = ''
        restoredFromLocal = true
        if (localDraft.savedAt) localDraftSavedAt.value = localDraft.savedAt
      } else {
        clearMealPlanLocalDraft(patientId.value, draftPlanKey.value)
        localDraftSavedAt.value = ''
      }
    } else if (localDraft?.savedAt) {
      localDraftSavedAt.value = localDraft.savedAt
    }

    await enrichUnlinkedFoodItems()

    if (restoredFromLocal) {
      captureBaselineFromPrescription()
    } else {
      captureBaselineFromForm()
    }
  } finally {
    suppressDraftSave = false
  }
}

const restrictionsText = computed(() => collectRestrictions(props.profile, props.user))

const normalizedShoppingList = computed(() => normalizeShoppingList(form.shoppingList))
const shoppingListItems = computed(() => buildShoppingListItems(
  form.meals,
  normalizedShoppingList.value.customText,
  {
    methodology: form.methodology,
    periodDays: normalizedShoppingList.value.periodDays,
  },
))

function mealMacros(meal) {
  return resolvedMealMacros(meal)
}

function mealMacroSummary(meal) {
  return buildMealMacroSummary(mealMacros(meal))
}

const liveNutritionTotals = computed(() => {
  if (form.methodology !== 'foods' && form.methodology !== 'equivalents') {
    return {
      caloriesKcal: form.nutritionTotals?.caloriesKcal ?? 0,
      proteinG: form.nutritionTotals?.proteinG ?? 0,
      carbsG: form.nutritionTotals?.carbsG ?? 0,
      fatG: form.nutritionTotals?.fatG ?? 0,
    }
  }
  const totals = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  for (const meal of form.meals || []) {
    const macros = mealMacros(meal)
    totals.caloriesKcal += macros.caloriesKcal || 0
    totals.proteinG += macros.proteinG || 0
    totals.carbsG += macros.carbsG || 0
    totals.fatG += macros.fatG || 0
  }
  if (!totals.caloriesKcal && form.nutritionTotals?.caloriesKcal) {
    return {
      caloriesKcal: Math.round(form.nutritionTotals.caloriesKcal || 0),
      proteinG: roundMacroFromTotals(form.nutritionTotals.proteinG),
      carbsG: roundMacroFromTotals(form.nutritionTotals.carbsG),
      fatG: roundMacroFromTotals(form.nutritionTotals.fatG),
    }
  }
  return {
    caloriesKcal: Math.round(totals.caloriesKcal),
    proteinG: roundMacroFromTotals(totals.proteinG),
    carbsG: roundMacroFromTotals(totals.carbsG),
    fatG: roundMacroFromTotals(totals.fatG),
  }
})

function roundMacroFromTotals(value) {
  return Math.round(Number(value || 0) * 10) / 10
}

const nutritionReport = computed(() =>
  buildMealPlanNutritionReport(form.meals, form.nutritionTotals),
)

function formatPrintDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return '—'
  const date = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString('pt-BR')
}

const nutritionPrintContext = computed(() => {
  const period = WEEK_DAYS.find((day) => day.id === activeDay.value)?.label || 'Todos os dias da semana'
  const endLabel = form.indefinite
    ? 'Indeterminado'
    : (formatPrintDate(form.endDate) !== '—' ? formatPrintDate(form.endDate) : '—')

  return {
    planTitle: String(form.title || '').trim() || 'Plano alimentar',
    patientName: String(props.user?.name || '').trim() || '—',
    startDate: formatPrintDate(form.startDate),
    endDate: endLabel,
    dietType: String(form.dietType || '').trim() || '—',
    objective: String(form.objective || '').trim() || '—',
    period,
    methodology: methodologyLabel(form.methodology),
  }
})

const mealNutritionRows = computed(() => {
  return (form.meals || []).map((meal) => {
    const macros = mealMacros(meal)
    return {
      id: meal.id,
      label: `${meal.time || '—'} · ${meal.label || 'Refeição'}`,
      caloriesKcal: macros.caloriesKcal || 0,
      carbsG: macros.carbsG || 0,
      proteinG: macros.proteinG || 0,
      fatG: macros.fatG || 0,
    }
  })
})

const faithfulPdfReport = computed(() => {
  return buildFaithfulPdfReportRows(form.meals, form.pdfNutritionTotals || form.nutritionTotals)
})

const faithfulFoodComposition = computed(() => {
  return buildFaithfulFoodCompositionRows(form.meals)
})

const hasFaithfulPdfReport = computed(() => {
  return faithfulPdfReport.value.rows.some((row) =>
    row.proteinG != null || row.fatG != null || row.carbsG != null || row.caloriesKcal,
  ) || Boolean(form.pdfNutritionTotals?.caloriesKcal || form.nutritionTotals?.caloriesKcal)
})

function findFoodItemById(itemId) {
  for (const meal of form.meals || []) {
    const item = (meal.items || []).find((entry) => entry.id === itemId)
    if (item) return item
  }
  return null
}

function toggleSubstitutions(itemId) {
  const item = findFoodItemById(itemId)
  if (item) syncItemSubstitutionOptions(item)

  const next = new Set(expandedSubs.value)
  if (next.has(itemId)) next.delete(itemId)
  else next.add(itemId)
  expandedSubs.value = next
}

function onSubstitutionsChange(item) {
  syncItemSubstitutionOptions(item)
}

/* Observações da refeição: escondidas até serem pedidas, para o card não
   carregar um textarea vazio em toda refeição. */
function isNotesOpen(meal) {
  if (!meal) return false
  return openNotesMeals.value.has(meal.id) || Boolean(String(meal.notes || '').trim())
}

function openMealNotes(mealId) {
  const next = new Set(openNotesMeals.value)
  next.add(mealId)
  openNotesMeals.value = next
  nextTick(() => {
    notesRefs.get(mealId)?.focus?.()
  })
}

function registerNotesRef(mealId, el) {
  if (el) notesRefs.set(mealId, el)
  else notesRefs.delete(mealId)
}


function hydrateFormFromPrescription() {
  const next = hydratePrescriptionFromRecord(props.prescription)
  Object.assign(form, next)
  expandedMeals.value = new Set((form.meals || []).map((meal) => meal.id))
  expandedSubs.value = new Set()
  editingItemId.value = ''
}

function syncFoodDisplay(item) {
  const name = String(item.name || '').trim()
  const portion = foodItemPortionLabel(item)
  item.display = portion ? `${name} ${portion}`.trim() : name
}

function startEditItem(item) {
  normalizeFoodEditorItem(item)
  if (!item.portionAmount) item.portionAmount = Number(item.amount) || 1
  if (!item.portionMeasure) {
    if (String(item.unit || '').toLowerCase().includes('grama')) item.portionMeasure = 'grams'
    else item.portionMeasure = 'unidade'
  }
  editingItemId.value = item.id
}

function finishEditItem(item, mealIndex, itemIndex) {
  if (!String(item.name || '').trim()) {
    form.meals[mealIndex]?.items?.splice(itemIndex, 1)
    editingItemId.value = ''
    return
  }
  normalizeFoodEditorItem(item)
  syncFoodDisplay(item)
  const meal = form.meals[mealIndex]
  if (meal) meal.macros = mealMacros(meal)
  editingItemId.value = ''
}

function onFoodPickerSelect(item, food) {
  item.name = food.displayName || food.name
  item.foodId = food.id || ''
  item.linkedFoodName = food.displayName || food.name || ''
  item.foodSource = food.source || ''
  item.per100g = food.per100g || null
  item.nutrientsPer100g = extractNutrientsPer100gFromFood(food)
  if (!item.grams) {
    applyFoodItemMeasure(item, { measureId: 'porcao_media', amount: 1, grams: 100 })
  }
}

function onPortionChange(item, payload) {
  applyFoodItemMeasure(item, payload)
}

function formatItemMacro(item, key, asKcal = false) {
  const macros = computeFoodItemMacros(item)
  if (!macros) return '—'
  if (asKcal) return formatMacroKcal(macros.caloriesKcal)
  return formatMacroGrams(macros[key])
}

async function enrichUnlinkedFoodItems() {
  if (form.methodology !== 'foods') return
  enrichingFoods.value = true
  enrichProgress.value = 'Vinculando alimentos à TBCA/TACO…'
  try {
    const { prescription, changed } = await enrichPrescriptionFoodItems(
      { ...form, meals: form.meals },
      matchFoodForMealPlan,
      {
        matchFoodBatch: matchFoodBatchForMealPlan,
        onProgress: ({ done, total, phase }) => {
          if (!total) return
          if (phase === 'start') {
            enrichProgress.value = total === 1
              ? 'Vinculando 1 alimento à TBCA/TACO…'
              : `Vinculando ${total} alimentos em lote…`
            return
          }
          enrichProgress.value = `Vinculado ${done}/${total} TBCA`
        },
      },
    )
    if (changed) {
      Object.assign(form, prescription)
      expandedMeals.value = new Set((form.meals || []).map((meal) => meal.id))
    }
  } finally {
    enrichingFoods.value = false
    enrichProgress.value = ''
  }
}

watch(
  prescriptionSyncKey,
  () => {
    if (editingItemId.value) return
    void initEditorFromPrescription()
  },
  { immediate: true },
)

watch(
  form,
  () => {
    syncUnsavedChanges()
    scheduleLocalDraftSave()
  },
  { deep: true },
)

watch(
  () => [props.saveMessage, props.saveError],
  ([message, isError]) => {
    if (!message || isError) return
    if (/salvo|publicado/i.test(String(message))) {
      captureBaselineFromForm()
    }
  },
)

onBeforeUnmount(() => {
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
})

watch(expandAll, (value) => {
  if (value) {
    expandedMeals.value = new Set((form.meals || []).map((meal) => meal.id))
  } else {
    expandedMeals.value = new Set()
  }
})

function isExpanded(id) {
  return expandedMeals.value.has(id)
}

function toggleMeal(id) {
  const next = new Set(expandedMeals.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedMeals.value = next
}

function addMeal() {
  form.meals.push({
    id: crypto.randomUUID(),
    time: '15:00',
    label: 'Nova refeição',
    items: [],
    notes: '',
    macros: null,
  })
}

function duplicateMeal(index) {
  const source = form.meals[index]
  if (!source) return
  form.meals.splice(index + 1, 0, {
    id: crypto.randomUUID(),
    time: source.time,
    label: `${source.label} (cópia)`,
    items: (source.items || []).map((item) => ({
      id: crypto.randomUUID(),
      foodId: item.foodId || '',
      linkedFoodName: item.linkedFoodName || '',
      foodSource: item.foodSource || '',
      groupId: item.groupId || '',
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      options: item.options || '',
      itemType: item.itemType || '',
      recipeId: item.recipeId || '',
      recipeSnapshot: item.recipeSnapshot
        ? JSON.parse(JSON.stringify(item.recipeSnapshot))
        : null,
      servingLabel: item.servingLabel || '',
      substitutions: Array.isArray(item.substitutions)
        ? item.substitutions.map((sub) => ({ ...sub, id: crypto.randomUUID() }))
        : [],
      display: item.display || '',
      grams: item.grams ?? null,
      ml: item.ml ?? null,
      per100g: item.per100g ? { ...item.per100g } : null,
      portionAmount: item.portionAmount ?? null,
      portionMeasure: item.portionMeasure || '',
    })),
    notes: source.notes || '',
    macros: source.macros ? { ...source.macros } : null,
    pdfMacros: source.pdfMacros ? { ...source.pdfMacros } : (source.macros ? { ...source.macros } : null),
  })
}

function removeMeal(index) {
  if (!confirm('Excluir esta refeição?')) return
  form.meals.splice(index, 1)
}

function addFood(mealIndex) {
  const item = createEmptyMealItem(form.methodology)
  form.meals[mealIndex].items.push(item)
  startEditItem(item)
}

async function loadPatientOptions() {
  try {
    const users = await $fetch(`${apiBase.value}/users`, authFetchInit())
    patientOptions.value = (Array.isArray(users) ? users : [])
      .filter((entry) => entry?.role === 'PACIENTE')
      .map((entry) => ({ id: entry.id, name: entry.name, avatar: entry.avatar }))
  } catch {
    patientOptions.value = props.user?.id
      ? [{ id: props.user.id, name: props.user.name, avatar: props.user.avatar }]
      : []
  }
}

function openRecipeEditor(seed = null, mealIndex = -1, item = null) {
  recipeEditorSeed.value = seed
  recipeTarget.value = { mealIndex, item }
  recipeEditorOpen.value = true
}

function closeRecipeEditor() {
  recipeEditorOpen.value = false
  recipeEditorSeed.value = null
  recipeTarget.value = { mealIndex: -1, item: null }
}

function addRecipe(mealIndex) {
  const item = createEmptyRecipeMealItem()
  form.meals[mealIndex].items.push(item)
  openRecipeEditor(null, mealIndex, item)
}

function onRecipePickerTrigger(mealIndex, item) {
  openRecipeEditor(item?.recipeSnapshot || null, mealIndex, item)
}

function onRecipeSaved(recipe) {
  const { mealIndex, item } = recipeTarget.value
  if (item) {
    applyRecipeToMealItem(item, recipe)
    editingItemId.value = ''
  } else if (mealIndex >= 0) {
    const mealItem = createEmptyRecipeMealItem(recipe)
    form.meals[mealIndex].items.push(mealItem)
  }
  closeRecipeEditor()
}

function onRecipeInserted(recipe) {
  onRecipeSaved(recipe)
}

function editRecipeItem(item, mealIndex) {
  openRecipeEditor(item.recipeSnapshot || { id: item.recipeId, title: item.name }, mealIndex, item)
}

function recipeIngredientsMissingCount(item) {
  const recipe = item?.recipeSnapshot
  if (!recipe) return 0
  return recipeIngredientsMissingData(recipe).length
}

onMounted(() => {
  loadPatientOptions()
})

function onEquivalentGroupChange(item, groupId) {
  const group = findEquivalentGroup(groupId)
  if (!group) return
  item.groupId = group.id
  item.name = group.label
  if (!String(item.options || '').trim()) {
    item.options = group.examples
  }
}

function syncEquivalentUnit(item) {
  item.unit = formatPortionUnit(item.amount)
}

function removeFood(mealIndex, itemIndex) {
  form.meals[mealIndex].items.splice(itemIndex, 1)
}

function substitutionButtonTitle(item) {
  const counts = countSubstitutionsByType(item)
  if (expandedSubs.value.has(item.id)) return 'Ocultar substituições'
  if (!counts.total) return 'Opções de substituição'
  const parts = []
  if (counts.food) parts.push(`${counts.food} alimento(s)`)
  if (counts.group) parts.push(`${counts.group} grupo(s)`)
  if (counts.recipe) parts.push(`${counts.recipe} receita(s)`)
  return `Substituições (${parts.join(', ')})`
}

function sortByTime() {
  form.meals.sort((a, b) => String(a.time).localeCompare(String(b.time)))
}

function prepareFormForSave() {
  editingItemId.value = ''

  for (const meal of form.meals || []) {
    meal.items = (meal.items || []).filter((item) => String(item.name || '').trim())
    for (const item of meal.items) {
      if (isRecipeMealItem(item)) {
        item.display = recipeDisplayLabel(item)
        continue
      }
      normalizeFoodEditorItem(item)
      syncItemSubstitutionOptions(item)
      item.options = parseSubstitutionList(item).join('\n')
      syncFoodDisplay(item)
    }
    if (!meal.pdfMacros && meal.macros?.caloriesKcal) {
      meal.pdfMacros = { ...meal.macros }
    }
    meal.macros = mealMacros(meal)
  }

  if (!form.pdfNutritionTotals && form.nutritionTotals?.caloriesKcal) {
    form.pdfNutritionTotals = { ...form.nutritionTotals }
  }

  if (form.methodology === 'foods' || form.methodology === 'equivalents') {
    const totals = liveNutritionTotals.value
    form.nutritionTotals = { ...totals }
  }

  if (form.methodology === 'qualitative') {
    syncQualitativeEditorContent(form)
  }
}

function payload(status) {
  prepareFormForSave()
  return {
    ...JSON.parse(JSON.stringify(form)),
    status,
  }
}

function saveDraft() {
  emit('save', { ...payload('draft') })
}

function publishPlan() {
  emit('publish', { ...payload('active') })
}

defineExpose({ form, hasUnsavedChanges, confirmLeave })
</script>

<style scoped>
.mped {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mped--sheet {
  gap: 0.75rem;
}

.mped--sheet .mped-layout {
  flex: 1;
  min-height: 0;
  align-items: stretch;
  overflow: hidden;
}

.mped--sheet .mped-main {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mped--sheet .mped-sidebar {
  position: static;
  align-self: stretch;
  min-height: 0;
  max-height: none;
  overflow: hidden;
  gap: 0.65rem;
}

.mped--sheet .mped-sidebar-nutrition {
  flex-shrink: 0;
}

.mped--sheet .mped-sidebar-body {
  padding-bottom: 0.15rem;
}

.mped--sheet .mped-sidebar-footer {
  position: static;
  flex-shrink: 0;
  margin-top: 0;
  border-top: 1px solid #eef1ee;
  box-shadow: 0 -6px 16px rgba(15, 23, 42, 0.05);
}

.mped-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.mped-patient {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.mped-patient strong {
  display: block;
  font-size: 0.95rem;
  color: #2c322c;
}

.mped-patient p {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: #6b7368;
}

.mped-head-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.mped-btn {
  min-height: 2.1rem !important;
  padding: 0.35rem 0.75rem !important;
  font-size: 0.8125rem !important;
}

.mped-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22rem;
  gap: 1rem;
  align-items: start;
}

.mped-main {
  min-width: 0;
  padding: 1rem;
  border-radius: var(--cf-radius-control);
  border: 1px solid #e8ece9;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.mped-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: sticky;
  top: 0.75rem;
  align-self: start;
  min-height: 0;
}

.mped-sidebar-nutrition {
  flex-shrink: 0;
  min-width: 0;
}

.mped-sidebar-body {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 0.75rem;
  align-content: start;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mped-meals {
  display: grid;
  gap: 0.85rem;
  margin-top: 0.5rem;
}

.mped-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem 1rem;
  flex-wrap: wrap;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eef1ee;
}

.mped-toolbar__block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-width: 0;
}

.mped-toolbar__label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #8a9288;
  white-space: nowrap;
}

.mped-day-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.mped-day-pill {
  border: 1px solid #e2e8e4;
  background: #fff;
  padding: 0.35rem 0.65rem;
  border-radius: var(--cf-radius-control);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 400;
  color: #5f675f;
  cursor: pointer;
}

.mped-day-pill:hover:not(.mped-day-pill--active) {
  border-color: #c8dcc4;
  background: #f8faf8;
  color: #2c322c;
}

.mped-day-pill:focus-visible {
  outline: 2px solid var(--primary, #8b967c);
  outline-offset: 2px;
}

.mped-day-pill--active {
  border-color: #8b967c;
  background: #8b967c;
  color: #fff;
  font-weight: 600;
}

.mped-meal-list {
  display: grid;
  gap: 0.75rem;
}

.mped-meal {
  border: 1px solid #e8ece9;
  overflow: hidden;
  border-radius: var(--cf-radius-xs);
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.mped-meal-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 0.5rem 0.65rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  background: #fafbfa;
  border-bottom: 1px solid #eef1ee;
}

.mped-meal-header__title :deep(.cf-time-input--compact .cf-time-trigger) {
  --cf-squircle-r: var(--cf-radius-xs);
  border-radius: var(--cf-radius-xs);
}

.mped-meal-header__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.mped-meal-header__chevron svg {
  width: 1rem;
  height: 1rem;
  transition: transform 0.15s ease;
}

.mped-meal-header__title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1;
}

.mped-meal-header__sep {
  color: #cbd5e1;
  font-weight: 300;
  flex-shrink: 0;
}

/* Nome da refeição é um título editável, não um formulário:
   a caixa só aparece quando o campo é alvo de interação. */
.mped-meal-name--header {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 22rem;
  min-height: 2rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #2c322c;
  box-sizing: border-box;
  line-height: 1.25;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.mped-meal-name--header::placeholder {
  font-weight: 400;
  color: #9aa39a;
}

.mped-meal-name--header:hover {
  border-color: #e2e8e4;
  background: #fff;
}

.mped-meal-name--header:focus {
  outline: none;
  background: #fff;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 2px rgba(45, 90, 39, 0.08);
}

@supports (corner-shape: squircle) {
  .mped-meal-name--header {
    corner-shape: squircle;
  }
}

.mped-meal-header__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  justify-content: flex-end;
}

.mped-meal-header__actions {
  display: inline-flex;
  gap: 0.3rem;
}

.mped-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  border-radius: var(--cf-radius-xs);
  font-size: 0.65rem;
  font-weight: 400;
  white-space: nowrap;
}

.mped-chip--c { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
.mped-chip--p { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
.mped-chip--f { background: rgba(234, 179, 8, 0.15); color: #b45309; }
.mped-chip--kcal { background: rgba(139, 150, 124, 0.16); color: #5f7560; }

.mped-chip small {
  margin-left: 0.12rem;
  font-size: 0.62rem;
  font-weight: 500;
  opacity: 0.85;
}

.mped-meal-macros-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
  padding: 0.65rem 0.75rem;
  border-top: 1px solid #eef1ee;
  background: #fafbfa;
}

.mped-meal-macros-bar__title {
  font-size: 0.68rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.mped-meal-macros-bar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
}

.mped-meal-notes {
  margin: 0;
  padding-top: 0;
  width: 100%;
}

.mped-meal-notes textarea {
  min-height: 4.75rem;
  padding: 0.95rem 0.9rem 0.85rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  resize: vertical;
}

.mped-side-card {
  min-width: 0;
  padding: 0.85rem;
  border-radius: var(--cf-radius-control);
  border: 1px solid #e8ece9;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.mped-side-card--table {
  overflow: hidden;
}

.mped-side-card h4 {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #2c322c;
}

.mped-side-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.mped-side-badge {
  display: inline-flex;
  min-width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  padding: 0 0.35rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(139, 150, 124, 0.16);
  color: #5f7560;
  font-size: 0.68rem;
  font-weight: 500;
}

.mped-shopping-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.mped-shopping-list li {
  font-size: 0.78rem;
  font-weight: 400;
  color: #5f675f;
  padding: 0.25rem 0;
  border-bottom: 1px solid #f1f3f2;
}

.mped-side-empty {
  margin: 0;
  font-size: 0.78rem;
  color: #8a9288;
}

.mped-side-card--muted p {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #6b7368;
  line-height: 1.45;
}

.mped-side-tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #eef1ee;
  padding-bottom: 0.45rem;
}

.mped-side-tab {
  font-size: 0.75rem;
  font-weight: 400;
  color: #8a9288;
}

.mped-side-tab--active {
  color: #5f7560;
  font-weight: 500;
}

.mped-donut-wrap {
  display: grid;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.mped-donut-ring {
  width: 7rem;
  height: 7rem;
  margin: 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.mped-donut-hole {
  width: 5.85rem;
  height: 5.85rem;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px #eef1ee;
}

.mped-donut-hole span {
  font-size: 0.92rem;
  font-weight: 500;
  color: #2c322c;
  line-height: 1.1;
}

.mped-donut-hole small {
  font-size: 0.62rem;
  color: #8a9288;
}

.mped-donut-legend {
  display: grid;
  gap: 0.25rem;
  font-size: 0.68rem;
  font-weight: 400;
  color: #6b7368;
}

.mped-legend-dot {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  margin-right: 0.25rem;
  vertical-align: middle;
}

.mped-legend-dot--c { background: #3b82f6; }
.mped-legend-dot--p { background: #ef4444; }
.mped-legend-dot--f { background: #eab308; }

.mped-macro-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--cf-radius-pill);
  margin-bottom: 0.25rem;
  min-height: 1.55rem;
}

.mped-macro-row dt {
  font-size: 0.72rem;
  font-weight: 400;
  color: #5f675f;
}

.mped-macro-row dd {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: #2c322c;
}

.mped-macro-row--c { background: rgba(59, 130, 246, 0.08); }
.mped-macro-row--p { background: rgba(239, 68, 68, 0.08); }
.mped-macro-row--f { background: rgba(234, 179, 8, 0.1); }

.mped-config {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 0.65rem 0.7rem;
  margin-bottom: 0.85rem;
  align-items: start;
}

/* O "sem data de término" fica colado ao campo que ele desabilita,
   em vez de sobrar como um 5º item numa grade de 4 colunas. */
.mped-config-end {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.mped-check {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #5f675f;
  cursor: pointer;
}

.mped-check input {
  cursor: pointer;
}

.mped-field--disabled {
  opacity: 0.55;
}

.mped-field--disabled :is(.cf-date-input, .cf-select) {
  pointer-events: none;
}

.mped-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 0.5rem;
  font-size: 0.72rem;
  color: #6b7368;
}

.mped-qualitative-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.65rem;
}

.mped-qualitative-notice {
  margin: 0;
  flex: 1 1 100%;
  font-size: 0.76rem;
  color: #8b967c;
}

.mped-qualitative-editor {
  min-height: 18rem;
}

.mped-qualitative-editor :deep(.pare) {
  min-height: 18rem;
}

.mped-qualitative-editor :deep(.pare-editor) {
  min-height: 14rem;
}

.mped-legend strong {
  color: #8b967c;
}

.mped-legend small {
  margin-left: auto;
  color: #8a9288;
}

.mped-editor-wrap textarea,
.mped-notes-wrap textarea {
  min-height: 16rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.mped-meals-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0;
  padding: 0.55rem 0.7rem;
  border-radius: var(--cf-radius-xs);
  background: #f5f7f3;
  font-size: 0.78rem;
  color: #5f675f;
  line-height: 1.45;
}

.mped-meals-hint__icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: #8b967c;
}

.mped-meals-tools {
  display: flex;
  gap: 0.35rem;
  margin-left: auto;
  flex-shrink: 0;
}

.mped-btn-sm {
  min-height: 1.85rem !important;
  padding: 0.25rem 0.55rem !important;
  font-size: 0.72rem !important;
}

.mped-inline-input,
.mped-equiv-group,
.mped-equiv-options {
  min-height: 2rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-xs);
  font-size: 0.78rem;
  background: #fff;
  box-shadow: none;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.mped-meal-name:focus,
.mped-inline-input:focus,
.mped-equiv-group:focus,
.mped-equiv-options:focus {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 2px rgba(45, 90, 39, 0.08);
}

@supports (corner-shape: squircle) {
  .mped-meal-name,
  .mped-inline-input,
  .mped-equiv-group,
  .mped-equiv-options {
    corner-shape: squircle;
  }
}

.mped-macros {
  display: flex;
  gap: 0.25rem;
  font-size: 0.62rem;
  color: #6b7280;
}

.mped-dot::before {
  content: '● ';
}

.mped-dot--p::before { color: #ef4444; }
.mped-dot--c::before { color: #3b82f6; }
.mped-dot--f::before { color: #eab308; }

.mped-kcal {
  font-size: 0.68rem;
  color: #6b7280;
  white-space: nowrap;
}

.mped-expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
}

.mped-expand svg {
  width: 1rem;
  height: 1rem;
  transition: transform 0.15s ease;
}

.mped-chevron--open {
  transform: rotate(180deg);
}

.mped-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border: 1px solid #e2e8e4;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  border-radius: var(--cf-radius-xs);
  flex-shrink: 0;
}

@supports (corner-shape: squircle) {
  .mped-icon-btn {
    corner-shape: squircle;
  }
}

.mped-icon-btn svg {
  width: 0.85rem;
  height: 0.85rem;
}

.mped-icon-btn--danger:hover {
  color: #b42318;
  border-color: rgba(180, 35, 24, 0.25);
}

.mped-meal-body {
  min-width: 0;
  padding: 0 0 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid #eef1ee;
  background: #fff;
}

.mped-meal-body__actions {
  min-width: 0;
  padding: 0.7rem 0.75rem 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
}

.mped-meal-empty {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  font-size: 0.78rem;
  color: #8a9288;
}

.mped-meal-empty svg {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
  stroke-width: 1.6;
}

.mped-meal-add {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.mped-notes-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  color: #8a9288;
  cursor: pointer;
  transition: color 0.15s ease;
}

.mped-notes-toggle svg {
  width: 0.9rem;
  height: 0.9rem;
}

.mped-notes-toggle:hover {
  color: var(--primary, #8b967c);
}

.mped-notes-toggle:focus-visible {
  outline: 2px solid var(--primary, #8b967c);
  outline-offset: 2px;
  border-radius: 3px;
}

.mped-food-grid {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.mped-food-grid__head,
.mped-food-grid__row,
.mped-food-grid__foot {
  display: grid;
  grid-template-columns: minmax(7rem, 1.15fr) minmax(8rem, 0.9fr) minmax(2.85rem, 3.25rem) minmax(2.85rem, 3.25rem) minmax(2.85rem, 3.25rem) minmax(3.35rem, 4rem) minmax(2.5rem, auto);
  gap: 0.5rem;
  align-items: center;
  padding: 0.45rem 0.75rem;
  min-width: 32rem;
}

.mped-food-grid__food,
.mped-food-grid__measure {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.mped-food-grid__food :deep(.mpfs),
.mped-food-grid__measure :deep(.mpms) {
  min-width: 0;
  max-width: 100%;
}

.mped-food-grid__head {
  background: #f8faf9;
  border-bottom: 1px solid #eef1ee;
  font-size: 0.68rem;
  font-weight: 500;
  color: #8a9288;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.mped-food-grid__head > :nth-child(1),
.mped-food-grid__head > :nth-child(2) {
  min-width: 0;
}

.mped-food-grid__row-wrap + .mped-food-grid__row-wrap {
  border-top: 1px solid #f1f3f2;
}

.mped-food-grid__row--editing {
  background: #fafbfa;
}

.mped-food-grid__row-wrap--editing {
  position: relative;
  z-index: 2;
}

.mped-food-grid__text {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #2c322c;
  text-align: left;
  cursor: pointer;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mped-food-grid__text--muted {
  color: #5f675f;
}

/* Linha de receita: tinta de fundo + o ícone da célula bastam para diferenciar. */
.mped-food-grid__row-wrap--recipe {
  background: rgba(245, 158, 11, 0.06);
}

.mped-food-grid__text--recipe {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.mped-food-grid__text--recipe svg {
  width: 1rem;
  height: 1rem;
  color: #d97706;
  flex-shrink: 0;
}

.mped-food-grid__text:hover {
  color: #5f7560;
}

.mped-food-grid__macro,
.mped-food-grid__kcal {
  font-size: 0.75rem;
  font-weight: 400;
  color: #5f675f;
  text-align: right;
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mped-food-grid__kcal {
  color: #374151;
}

.mped-food-grid__macro--c { color: #2563eb; }
.mped-food-grid__macro--p { color: #dc2626; }
.mped-food-grid__macro--f { color: #b45309; }

.mped-food-inline-macros {
  display: none;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem 0.55rem;
  border-top: 1px dashed #eef1ee;
  background: #fcfdfc;
}

.mped-food-grid__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
}

.mped-food-grid__foot {
  border-top: 1px solid #eef1ee;
  background: #f8faf9;
  font-size: 0.75rem;
  font-weight: 400;
  color: #5f675f;
}

.mped-food-grid__foot .mped-food-grid__macro,
.mped-food-grid__foot .mped-food-grid__kcal {
  font-weight: 500;
  color: #2c322c;
}

/* Adicionar item: affordance leve. O peso visual do editor pertence a
   "Salvar e publicar", não a um botão repetido em cada refeição. */
.mped-add-food {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.25rem;
  padding: 0.4rem 0.8rem;
  border: 1px dashed #c5cdc7;
  border-radius: var(--cf-radius-xs);
  background: #fff;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #5f675f;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.mped-add-food svg {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.mped-add-food:hover {
  border-color: var(--primary, #8b967c);
  border-style: solid;
  background: #f7f9f5;
  color: #2c322c;
}

.mped-add-food:focus-visible {
  outline: 2px solid var(--primary, #8b967c);
  outline-offset: 2px;
}

.mped-add-food--recipe:hover {
  border-color: #e0a53a;
  background: #fdf8ef;
}

.mped-add-food--recipe svg {
  color: #d97706;
}

.mped-line-done {
  border: none;
  background: transparent;
  color: #6d8b62;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.15rem 0.25rem;
}

.mped-line-done:hover {
  text-decoration: underline;
}

.mped-food-table {
  display: grid;
}

.mped-subs-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #6d8b62;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.mped-subs-link svg {
  width: 0.85rem;
  height: 0.85rem;
}

.mped-subs-link:hover {
  color: #4f6f45;
}

.mped-subs-link--active {
  color: #4f6f45;
  background: rgba(139, 150, 124, 0.14);
  border-radius: var(--cf-radius-control);
}

.mped-subs-panel {
  padding: 0 0.75rem 0.75rem;
  display: grid;
  gap: 0.35rem;
  border-top: 1px solid #f1f3f2;
  background: #fafbfa;
}

.mped-subs-field {
  margin-top: 0;
}

.mped-subs-field textarea {
  min-height: 4.25rem;
  resize: vertical;
  line-height: 1.45;
}

.mped-subs-hint {
  margin: 0;
  font-size: 0.72rem;
  color: #6b7368;
}

.mped-btn-foods {
  min-height: 1.85rem;
  padding: 0.25rem 0.65rem;
  border: 1px solid #8b967c;
  border-radius: var(--cf-radius-sm);
  background: #fff;
  color: #4f6f45;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.mped-btn-foods--open {
  background: #8b967c;
  color: #fff;
}

@supports (corner-shape: squircle) {
  .mped-btn-foods {
    corner-shape: squircle;
  }
}


.mped-equiv-row {
  display: grid;
  grid-template-columns: minmax(7rem, 10rem) 4rem auto minmax(0, 1fr) auto;
  gap: 0.35rem;
  align-items: center;
  padding: 0.55rem 0.75rem;
}

.mped-equiv-group,
.mped-equiv-options {
  min-height: 2rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid #e2e8e4;
  font-size: 0.78rem;
  background: #fff;
}

.mped-equiv-unit {
  font-size: 0.72rem;
  color: #6b7280;
  white-space: nowrap;
}

.mped-new-meal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  margin-top: 0.65rem;
  min-height: 2.75rem;
  padding: 0.55rem 1rem;
  border: 1.5px dashed #cfd6d0;
  border-radius: var(--cf-radius-control);
  background: #fbfcfb;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #5f675f;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.mped-new-meal svg {
  width: 1rem;
  height: 1rem;
}

.mped-new-meal:hover {
  border-color: var(--primary, #8b967c);
  background: #f5f8f2;
  color: #2c322c;
}

.mped-new-meal:focus-visible {
  outline: 2px solid var(--primary, #8b967c);
  outline-offset: 2px;
}

.mped-sidebar-footer {
  display: grid;
  gap: 0.5rem;
  padding: 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.mped-sidebar-footer__actions {
  display: grid;
  gap: 0.45rem;
}

.mped-sidebar-btn {
  width: 100%;
  justify-content: center;
}

.mped-local-draft {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  color: #6b7368;
  line-height: 1.35;
}

.mped-save-msg {
  margin: 0;
  font-size: 0.75rem;
  color: #15803d;
  line-height: 1.35;
}

.mped-save-msg--error {
  color: #b42318;
}

.mped-macro-list {
  margin: 0;
}

.mped-nutri-table-wrap {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.mped-nutri-table-wrap--tall {
  max-height: 16rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mped-side-table-note {
  margin: 0 0 0.55rem;
  font-size: 0.68rem;
  color: #8a9288;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.mped-nutri-table--faithful th:nth-child(n+2),
.mped-nutri-table--faithful td:nth-child(n+2) {
  color: #2c322c;
}

.mped-nutri-table--foods td:first-child {
  white-space: normal;
  min-width: 6.5rem;
  max-width: 8.5rem;
}

.mped-nutri-food {
  display: block;
  font-size: 0.68rem;
  color: #2c322c;
  line-height: 1.25;
}

.mped-nutri-meal {
  display: block;
  margin-top: 0.08rem;
  font-size: 0.6rem;
  color: #8a9288;
}

.mped-nutri-table__row--unlinked td {
  opacity: 0.72;
}

.mped-nutri-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.68rem;
}

.mped-nutri-table th,
.mped-nutri-table td {
  padding: 0.3rem 0.25rem;
  border-bottom: 1px solid #f1f3f2;
  text-align: left;
  white-space: nowrap;
}

.mped-nutri-table th {
  color: #8a9288;
  font-weight: 500;
}

.mped-nutri-table td:not(:first-child),
.mped-nutri-table th:not(:first-child) {
  text-align: right;
}

.mped-nutri-table tfoot td {
  font-weight: 600;
  color: #2c322c;
  border-top: 1px solid #e8ece9;
}

.mped-food-link {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.62rem;
  color: #6b7368;
  font-weight: 400;
}

.mped-food-link--warn {
  color: #b45309;
}

.mped-food-grid__text {
  display: block;
  text-align: left;
}

@media (max-width: 980px) {
  .mped-layout {
    grid-template-columns: 1fr;
  }

  .mped--sheet .mped-layout {
    grid-template-columns: minmax(0, 1fr) min(22rem, 34vw);
  }

  .mped-config {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mped-meal-header {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'chevron title'
      'chips chips'
      'actions actions';
  }

  .mped-meal-header__chevron { grid-area: chevron; }
  .mped-meal-header__title { grid-area: title; }
  .mped-meal-header__chips {
    grid-area: chips;
    justify-content: flex-start;
  }
  .mped-meal-header__actions {
    grid-area: actions;
    justify-content: flex-end;
  }

  .mped-food-grid__head,
  .mped-food-grid__row,
  .mped-food-grid__foot {
    min-width: 28rem;
    grid-template-columns: minmax(7rem, 1fr) minmax(9rem, 1fr) 2.25rem 2.25rem 2.25rem 3.25rem auto;
  }

  .mped-food-grid__macro,
  .mped-food-grid__kcal,
  .mped-food-grid__head .mped-food-grid__macro:nth-child(n+3) {
    display: none;
  }

  .mped-food-inline-macros {
    display: flex;
  }

  .mped-meal-macros-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .mped-meal-macros-bar__chips {
    justify-content: flex-start;
  }

  .mped-equiv-row {
    grid-template-columns: 1fr;
  }

  .mped-grip,
  .mped-macros,
  .mped-kcal {
    display: none;
  }
}

@media (max-width: 720px) {
  .mped-head {
    flex-direction: column;
  }

  .mped-config {
    grid-template-columns: 1fr;
  }
}
</style>
