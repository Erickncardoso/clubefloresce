<template>
  <NuxtLayout name="dashboard">
    <div class="checkin-admin admin-shell">
      <header class="admin-shell-header">
        <div>
          <h1>Check-ins</h1>
          <p>Crie tipos de check-in personalizados e acompanhe as respostas dos pacientes.</p>
        </div>
      </header>

      <section class="checkin-dispatch-card admin-shell-card">
        <div class="checkin-dispatch-copy">
          <h2>Disparos de check-in</h2>
          <p>
            O disparo automático semanal ocorre na <strong>sexta às 11h</strong>. Você também pode enviar
            check-ins individuais, escolher o paciente, o tipo e programar a data do envio.
          </p>
          <p v-if="dispatchStatus.dispatched" class="checkin-dispatch-note">
            Disparo em massa desta semana já realizado.
          </p>
        </div>

        <div class="checkin-dispatch-actions">
          <button
            type="button"
            class="btn-ghost checkin-dispatch-btn"
            :disabled="dispatching"
            @click="dispatchWeeklyCheckIn"
          >
            {{ dispatching ? 'Enviando...' : 'Disparar semanal (todas)' }}
          </button>
        </div>

        <form class="checkin-custom-dispatch" @submit.prevent="submitCustomDispatch">
          <h3>Disparo personalizado</h3>
          <div class="dispatch-fields">
            <div class="dispatch-field">
              <label for="dispatch-template">Tipo de check-in</label>
              <SharedCfSelect
                id="dispatch-template"
                v-model="customDispatch.templateId"
                :options="dispatchTemplateOptions"
                placeholder="Selecione o check-in"
              />
            </div>
            <div class="dispatch-field">
              <label for="dispatch-period">Período de referência (opcional)</label>
              <SharedCfDateInput
                id="dispatch-period"
                v-model="customDispatch.periodDate"
                :title="dispatchPeriodHint"
              />
              <small class="dispatch-field-hint">{{ dispatchPeriodHint }}</small>
            </div>
            <div class="dispatch-field">
              <label for="dispatch-when">Enviar</label>
              <SharedCfSelect
                id="dispatch-when"
                v-model="customDispatch.mode"
                :options="dispatchModeOptions"
              />
            </div>
            <div v-if="customDispatch.mode === 'schedule'" class="dispatch-field">
              <label for="dispatch-scheduled-at">Data e hora do envio</label>
              <SharedCfDateTimeInput
                id="dispatch-scheduled-at"
                v-model="customDispatch.scheduledAt"
                required
              />
            </div>
            <div class="dispatch-field dispatch-field--full">
              <label for="dispatch-title">Título da notificação (opcional)</label>
              <input
                id="dispatch-title"
                v-model="customDispatch.title"
                class="dispatch-control"
                type="text"
                maxlength="80"
                placeholder="Ex: Check-in da semana"
              >
            </div>
            <div class="dispatch-field dispatch-field--full">
              <label for="dispatch-body">Mensagem (opcional)</label>
              <input
                id="dispatch-body"
                v-model="customDispatch.body"
                class="dispatch-control"
                type="text"
                maxlength="200"
                placeholder="Texto que o paciente verá na notificação"
              >
            </div>
          </div>

          <div class="dispatch-patients">
            <div class="dispatch-patients-head">
              <strong>Pacientes</strong>
              <label class="form-check cf-round-check dispatch-all-check">
                <input v-model="customDispatch.allPatients" type="checkbox" class="cf-round-check-input">
                <span class="cf-round-check-box" aria-hidden="true"><Check class="cf-round-check-icon" /></span>
                <span class="cf-round-check-label">Todos os pacientes</span>
              </label>
            </div>
            <div v-if="!customDispatch.allPatients" class="dispatch-patient-tools">
              <div class="dispatch-patients-meta">
                <span>{{ dispatchPatients.length }} pacientes cadastrados</span>
                <span v-if="customDispatch.userIds.length" class="dispatch-patients-selected">
                  {{ customDispatch.userIds.length }} selecionada(s)
                </span>
              </div>

              <div v-if="selectedDispatchPatients.length" class="dispatch-selected-list" aria-label="Pacientes selecionadas">
                <span
                  v-for="patient in selectedDispatchPatients"
                  :key="patient.id"
                  class="dispatch-selected-chip"
                >
                  {{ patient.name }}
                  <button
                    type="button"
                    class="dispatch-selected-chip-remove"
                    :aria-label="`Remover ${patient.name}`"
                    @click="removeDispatchPatient(patient.id)"
                  >
                    ×
                  </button>
                </span>
              </div>

              <div class="nutri-search dispatch-search">
                <Search class="nutri-search-icon" />
                <input
                  v-model="dispatchPatientSearch"
                  type="search"
                  placeholder="Buscar paciente por nome..."
                  aria-label="Buscar paciente para disparo"
                >
              </div>

              <div class="dispatch-patient-panel">
                <p v-if="dispatchPatientListHint" class="dispatch-patient-hint">{{ dispatchPatientListHint }}</p>

                <ul
                  v-if="visibleDispatchPatients.length"
                  class="dispatch-patient-list"
                  aria-label="Lista de pacientes"
                >
                  <li v-for="patient in visibleDispatchPatients" :key="patient.id">
                    <label class="dispatch-patient-item cf-round-check">
                      <input
                        v-model="customDispatch.userIds"
                        type="checkbox"
                        class="cf-round-check-input"
                        :value="patient.id"
                      >
                      <span class="cf-round-check-box" aria-hidden="true">
                        <Check class="cf-round-check-icon" />
                      </span>
                      <span class="cf-round-check-label dispatch-patient-name">{{ patient.name }}</span>
                    </label>
                  </li>
                </ul>

                <p v-else-if="!dispatchPatientListHint" class="dispatch-empty">Nenhum paciente encontrado.</p>
              </div>
            </div>
          </div>

          <button type="submit" class="btn-primary" :disabled="customDispatching">
            {{ customDispatching ? 'Processando...' : customDispatchSubmitLabel }}
          </button>
          <p v-if="customDispatchMessage" class="checkin-dispatch-feedback">{{ customDispatchMessage }}</p>
        </form>

        <div v-if="dispatchSchedules.length" class="dispatch-schedules">
          <h3>Agendamentos</h3>
          <ul>
            <li v-for="item in dispatchSchedules" :key="item.id" class="dispatch-schedule-item">
              <div>
                <strong>{{ item.templateTitle }}</strong>
                <span>{{ formatScheduleWhen(item.scheduledAt) }}</span>
                <small>{{ item.allPatients ? 'Todos os pacientes' : `${item.userIds.length} paciente(s)` }}</small>
              </div>
              <button type="button" class="btn-danger-ghost btn-sm" @click="cancelSchedule(item.id)">
                Cancelar
              </button>
            </li>
          </ul>
        </div>

        <p v-if="dispatchMessage" class="checkin-dispatch-feedback">{{ dispatchMessage }}</p>
      </section>

      <nav class="checkin-tabs" aria-label="Seções de check-in">
        <button
          type="button"
          class="checkin-tab"
          :class="{ 'checkin-tab--active': activeTab === 'responses' }"
          @click="activeTab = 'responses'"
        >
          Respostas
        </button>
        <button
          type="button"
          class="checkin-tab"
          :class="{ 'checkin-tab--active': activeTab === 'templates' }"
          @click="activeTab = 'templates'"
        >
          Tipos de check-in
        </button>
      </nav>

      <!-- Respostas -->
      <section v-if="activeTab === 'responses'" class="checkin-section">
        <div class="nutri-toolbar">
          <div class="nutri-search">
            <Search class="nutri-search-icon" />
            <input
              v-model="responseSearch"
              type="search"
              placeholder="Buscar paciente ou check-in..."
              aria-label="Buscar respostas"
            >
          </div>
          <span class="nutri-count">{{ filteredResponses.length }} resposta{{ filteredResponses.length === 1 ? '' : 's' }}</span>
        </div>

        <div v-if="loadingResponses" class="loading-row">Carregando respostas...</div>

        <div v-else-if="!filteredResponses.length" class="nutri-empty admin-shell-card">
          <p>Nenhuma resposta ainda.</p>
          <span>Quando os pacientes responderem os check-ins, os dados aparecem aqui.</span>
        </div>

        <div v-else class="checkin-table-card admin-shell-card">
          <div class="checkin-table-wrap">
            <table class="checkin-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Check-in</th>
                  <th>Período</th>
                  <th>Resumo</th>
                  <th>Atualizado</th>
                  <th class="th-actions" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredResponses"
                  :key="item.id"
                  class="checkin-row"
                  @click="openViewModal(item)"
                >
                  <td>
                    <div class="checkin-patient">
                      <PatientAvatar
                        :src="item.user?.avatar"
                        :name="item.user?.name || 'Paciente'"
                        size="sm"
                        :ring="false"
                      />
                      <span class="checkin-name">{{ item.user?.name || 'Paciente' }}</span>
                    </div>
                  </td>
                  <td>{{ item.template?.title || '—' }}</td>
                  <td class="checkin-date">{{ formatPeriod(item.periodKey, item.template?.frequency) }}</td>
                  <td class="checkin-summary">{{ summarizeResponse(item) }}</td>
                  <td class="checkin-date">{{ formatDate(item.updatedAt) }}</td>
                  <td class="td-actions" @click.stop>
                    <div class="checkin-row-actions">
                      <button
                        v-if="item.user?.id"
                        type="button"
                        class="checkin-action-btn checkin-action-btn--ghost"
                        title="Fotos de refeições"
                        @click="openViewModal(item, 'fotos')"
                      >
                        <Image aria-hidden="true" />
                        Fotos
                      </button>
                      <button
                        v-if="item.user?.id"
                        type="button"
                        class="checkin-action-btn checkin-action-btn--ghost"
                        title="Gráfico nutricional"
                        @click="openViewModal(item, 'desempenho')"
                      >
                        <LineChart aria-hidden="true" />
                        Nutrição
                      </button>
                      <button
                        type="button"
                        class="checkin-action-btn checkin-action-btn--main"
                        @click="openViewModal(item)"
                      >
                        <Eye aria-hidden="true" />
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Tipos de check-in -->
      <section v-else class="checkin-section checkin-section--templates">
        <div class="templates-toolbar admin-shell-card">
          <div class="templates-toolbar-copy">
            <span class="templates-count" aria-hidden="true">{{ templates.length }}</span>
            <div>
              <strong>Tipos cadastrados</strong>
              <p>Formulários que os pacientes respondem no app — semanal, diário ou mensal.</p>
            </div>
          </div>
          <button type="button" class="btn-primary templates-create-btn" @click="openCreateTemplate">
            <Plus class="btn-icon" />
            Novo check-in
          </button>
        </div>

        <div v-if="loadingTemplates" class="loading-row">Carregando tipos...</div>

        <div v-else-if="!templates.length" class="nutri-empty admin-shell-card templates-empty">
          <p>Nenhum tipo de check-in</p>
          <span>Crie o primeiro formulário para seus pacientes começarem a responder.</span>
          <button type="button" class="btn-primary templates-empty-btn" @click="openCreateTemplate">
            <Plus class="btn-icon" />
            Criar check-in
          </button>
        </div>

        <div v-else class="templates-grid">
          <article
            v-for="tpl in sortedTemplates"
            :key="tpl.id"
            class="template-card admin-shell-card"
            :class="{ 'template-card--inactive': !tpl.active }"
          >
            <div class="template-card-accent" :class="`template-card-accent--${tpl.frequency || 'weekly'}`" aria-hidden="true" />

            <div class="template-card-body">
              <header class="template-card-head">
                <div class="template-card-title-wrap">
                  <span class="template-frequency">
                    <component :is="frequencyIcon(tpl.frequency)" class="template-frequency-icon" aria-hidden="true" />
                    {{ frequencyLabel(tpl.frequency) }}
                  </span>
                  <h3>{{ tpl.title }}</h3>
                </div>
                <div class="template-badges">
                  <span v-if="tpl.isDefault" class="template-badge template-badge--default">Padrão</span>
                  <span class="template-badge" :class="{ 'template-badge--off': !tpl.active }">
                    {{ tpl.active ? 'Ativo' : 'Inativo' }}
                  </span>
                </div>
              </header>

              <p class="template-desc">
                {{ tpl.description || 'Sem descrição — adicione um texto curto para orientar o paciente.' }}
              </p>

              <ul class="template-stats">
                <li>
                  <ListChecks class="template-stat-icon" aria-hidden="true" />
                  <span>
                    <strong>{{ templateQuestionCount(tpl) }}</strong>
                    {{ templateQuestionCount(tpl) === 1 ? 'pergunta' : 'perguntas' }}
                  </span>
                </li>
                <li>
                  <MessageSquare class="template-stat-icon" aria-hidden="true" />
                  <span>
                    <strong>{{ tpl._count?.responses || 0 }}</strong>
                    {{ (tpl._count?.responses || 0) === 1 ? 'resposta' : 'respostas' }}
                  </span>
                </li>
              </ul>
            </div>

            <footer class="template-actions">
              <button type="button" class="template-action template-action--primary" @click="openEditTemplate(tpl)">
                <Pencil class="template-action-icon" aria-hidden="true" />
                Editar
              </button>
              <button type="button" class="template-action" @click="toggleTemplateActive(tpl)">
                <Power class="template-action-icon" aria-hidden="true" />
                {{ tpl.active ? 'Desativar' : 'Ativar' }}
              </button>
              <button
                v-if="!tpl.isDefault"
                type="button"
                class="template-action template-action--danger"
                @click="deleteTemplate(tpl)"
              >
                <Trash2 class="template-action-icon" aria-hidden="true" />
                Excluir
              </button>
            </footer>
          </article>
        </div>
      </section>

      <!-- Modal editor -->
      <div v-if="editorOpen" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-card modal-card--editor" role="dialog" aria-modal="true" :aria-label="editorMode === 'create' ? 'Novo check-in' : 'Editar check-in'">
          <header class="modal-head">
            <h2>{{ editorMode === 'create' ? 'Novo check-in' : 'Editar check-in' }}</h2>
            <button type="button" class="modal-close" aria-label="Fechar" @click="closeEditor">×</button>
          </header>

          <div class="editor-layout">
            <form class="editor-form" @submit.prevent="saveTemplate">
              <div class="modal-fields">
                <div class="field field--float">
                  <label for="tpl-title">Título</label>
                  <input id="tpl-title" v-model="editor.title" type="text" required maxlength="120" placeholder="Ex: Check-in semanal">
                </div>
                <div class="field field--float">
                  <label for="tpl-desc">Descrição (opcional)</label>
                  <textarea id="tpl-desc" v-model="editor.description" rows="2" maxlength="300" placeholder="Breve explicação para o paciente" />
                </div>
                <div class="editor-form-row editor-form-row--inline">
                  <div class="field field--float editor-form-row-grow">
                    <label for="tpl-freq">Frequência</label>
                    <SharedCfSelect
                      id="tpl-freq"
                      v-model="editor.frequency"
                      :options="frequencyOptions"
                    />
                  </div>
                  <label class="form-check editor-form-check cf-round-check">
                    <input v-model="editor.active" type="checkbox" class="cf-round-check-input">
                    <span class="cf-round-check-box" aria-hidden="true">
                      <Check class="cf-round-check-icon" />
                    </span>
                    <span class="cf-round-check-label">Ativo para pacientes</span>
                  </label>
                </div>
              </div>

              <div class="steps-block">
                <div class="steps-head">
                  <h3>Perguntas</h3>
                  <button type="button" class="btn-ghost btn-sm" @click="addStep">+ Pergunta</button>
                </div>

                <div
                  v-for="(step, index) in editor.steps"
                  :key="step._key"
                  class="step-card"
                  :class="{ 'step-card--active': editorPreviewStep === index }"
                  @click="focusPreviewStep(index)"
                >
                  <div class="step-card-head">
                    <strong>Pergunta {{ index + 1 }}</strong>
                    <button
                      v-if="editor.steps.length > 1"
                      type="button"
                      class="btn-danger-ghost btn-sm"
                      @click.stop="removeStep(index)"
                    >
                      Remover
                    </button>
                  </div>
                  <div class="modal-fields">
                    <div class="editor-form-row editor-form-row--full">
                      <div class="field field--float editor-form-row-grow">
                        <label :for="`step-type-${step._key}`">Tipo</label>
                        <SharedCfSelect
                          :id="`step-type-${step._key}`"
                          v-model="step.type"
                          :options="stepTypeOptions"
                          @update:model-value="onStepTypeChange(step)"
                        />
                      </div>
                    </div>
                    <div class="field field--float">
                      <label :for="`step-question-${step._key}`">Pergunta</label>
                      <input :id="`step-question-${step._key}`" v-model="step.question" type="text" required maxlength="200" placeholder="Texto exibido para o paciente">
                    </div>
                    <div class="field field--float">
                      <label :for="`step-hint-${step._key}`">Dica (opcional)</label>
                      <input :id="`step-hint-${step._key}`" v-model="step.hint" type="text" maxlength="200" placeholder="Texto de apoio abaixo da pergunta">
                    </div>
                    <div v-if="step.type === 'choice'" class="field field--float">
                      <label :for="`step-options-${step._key}`">Opções de resposta (uma por linha)</label>
                      <textarea
                        :id="`step-options-${step._key}`"
                        v-model="step.optionsText"
                        rows="4"
                        placeholder="Ótimo&#10;Regular&#10;Ruim"
                      />
                    </div>

                    <div v-if="step.type === 'scale'" class="editor-form-row">
                      <div class="field field--float editor-form-row-grow">
                        <label :for="`step-scale-min-${step._key}`">Escala — mínimo</label>
                        <input
                          :id="`step-scale-min-${step._key}`"
                          v-model.number="step.scaleMin"
                          type="number"
                          min="0"
                          max="20"
                        >
                      </div>
                      <div class="field field--float editor-form-row-grow">
                        <label :for="`step-scale-max-${step._key}`">Escala — máximo</label>
                        <input
                          :id="`step-scale-max-${step._key}`"
                          v-model.number="step.scaleMax"
                          type="number"
                          min="1"
                          max="20"
                        >
                      </div>
                    </div>

                    <div v-if="step.type === 'water'" class="editor-step-config">
                      <div class="editor-form-row">
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-water-min-${step._key}`">Mín. (L)</label>
                          <input :id="`step-water-min-${step._key}`" v-model.number="step.waterMin" type="number" min="0" step="0.25">
                        </div>
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-water-max-${step._key}`">Máx. (L)</label>
                          <input :id="`step-water-max-${step._key}`" v-model.number="step.waterMax" type="number" min="0.25" step="0.25">
                        </div>
                      </div>
                      <div class="editor-form-row">
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-water-step-${step._key}`">Incremento (+/−)</label>
                          <input :id="`step-water-step-${step._key}`" v-model.number="step.waterStep" type="number" min="0.05" step="0.05">
                        </div>
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-water-default-${step._key}`">Valor inicial</label>
                          <input :id="`step-water-default-${step._key}`" v-model.number="step.waterDefault" type="number" min="0" step="0.25">
                        </div>
                      </div>
                    </div>

                    <div v-if="step.type === 'number'" class="editor-step-config">
                      <div class="editor-form-row">
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-num-min-${step._key}`">Mínimo</label>
                          <input :id="`step-num-min-${step._key}`" v-model.number="step.numberMin" type="number">
                        </div>
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-num-max-${step._key}`">Máximo</label>
                          <input :id="`step-num-max-${step._key}`" v-model.number="step.numberMax" type="number">
                        </div>
                      </div>
                      <div class="editor-form-row">
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-num-step-${step._key}`">Incremento (+/−)</label>
                          <input :id="`step-num-step-${step._key}`" v-model.number="step.numberStep" type="number" min="0.01" step="0.01">
                        </div>
                        <div class="field field--float editor-form-row-grow">
                          <label :for="`step-num-default-${step._key}`">Valor inicial</label>
                          <input :id="`step-num-default-${step._key}`" v-model.number="step.numberDefault" type="number">
                        </div>
                      </div>
                      <div class="field field--float">
                        <label :for="`step-num-unit-${step._key}`">Unidade (opcional)</label>
                        <input :id="`step-num-unit-${step._key}`" v-model="step.numberUnit" type="text" maxlength="24" placeholder="Ex: horas, copos, km">
                      </div>
                    </div>

                    <div v-if="step.type === 'exercise'" class="editor-form-row">
                      <div class="field field--float editor-form-row-grow">
                        <label :for="`step-yes-${step._key}`">Texto da opção positiva</label>
                        <input :id="`step-yes-${step._key}`" v-model="step.yesLabel" type="text" maxlength="80" placeholder="Sim, pratiquei hoje">
                      </div>
                      <div class="field field--float editor-form-row-grow">
                        <label :for="`step-no-${step._key}`">Texto da opção negativa</label>
                        <input :id="`step-no-${step._key}`" v-model="step.noLabel" type="text" maxlength="80" placeholder="Não pratiquei hoje">
                      </div>
                    </div>

                    <div v-if="step.type === 'text'" class="field field--float">
                      <label :for="`step-placeholder-${step._key}`">Placeholder do campo</label>
                      <input
                        :id="`step-placeholder-${step._key}`"
                        v-model="step.placeholder"
                        type="text"
                        maxlength="120"
                        placeholder="Sua resposta..."
                      >
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="editorError" class="error-text">{{ editorError }}</p>

              <footer class="modal-foot">
                <button type="button" class="btn-ghost" @click="closeEditor">Cancelar</button>
                <button type="submit" class="btn-primary" :disabled="savingTemplate">
                  {{ savingTemplate ? 'Salvando...' : 'Salvar' }}
                </button>
              </footer>
            </form>

            <aside class="editor-preview" aria-label="Prévia do check-in no app">
              <CheckinTemplateEditorPreview
                v-model:step-index="editorPreviewStep"
                :steps="previewSteps"
              />
            </aside>
          </div>
        </div>
      </div>

      <!-- Detalhe da resposta -->
      <div v-if="viewModalOpen && selectedResponse" class="modal-overlay" @click.self="closeViewModal">
        <div class="modal-card response-detail-card" role="dialog" aria-modal="true" aria-label="Resposta do check-in">
          <header class="modal-head response-detail-head">
            <div class="response-detail-head-main">
              <PatientAvatar
                :src="selectedResponse.user?.avatar"
                :name="selectedResponse.user?.name || 'Paciente'"
                size="md"
                :ring="false"
              />
              <div class="response-detail-head-copy">
                <span class="response-detail-kicker">{{ selectedResponse.template?.title || 'Check-in' }}</span>
                <h2 class="response-detail-name">{{ selectedResponse.user?.name || 'Paciente' }}</h2>
                <p class="response-detail-meta">
                  <span>{{ formatPeriod(selectedResponse.periodKey, selectedResponse.template?.frequency) }}</span>
                  <span>{{ formatDate(selectedResponse.updatedAt) }}</span>
                </p>
              </div>
            </div>
            <button type="button" class="modal-close" aria-label="Fechar" @click="closeViewModal">×</button>
          </header>

          <div class="response-detail-layout">
            <div class="response-detail-checkin">
              <h3 class="response-detail-subtitle">Respostas do check-in</h3>
              <div class="response-detail-body">
                <article v-for="row in answerRows" :key="row.id" class="response-answer-row">
                  <span class="response-answer-label">{{ row.label }}</span>
                  <strong class="response-answer-value">{{ row.value }}</strong>
                  <p v-if="row.question" class="response-answer-question">{{ row.question }}</p>
                </article>
              </div>
            </div>

            <aside v-if="selectedResponse.user?.id" class="response-detail-nutrition">
              <PatientsPatientNutritionSection
                v-model:active-tab="modalNutritionTab"
                :patient-id="selectedResponse.user.id"
                compact
                show-links
                :photo-limit="12"
                @navigate="goToPatient(selectedResponse.user.id, $event)"
              />
            </aside>
          </div>

          <footer class="modal-foot response-detail-foot">
            <button type="button" class="btn-ghost response-detail-foot-close" @click="closeViewModal">
              Fechar
            </button>
            <div v-if="selectedResponse.user?.id" class="response-detail-foot-actions">
              <button
                type="button"
                class="btn-ghost"
                :class="{ 'response-detail-foot-tab--active': modalNutritionTab === 'fotos' }"
                @click="modalNutritionTab = 'fotos'"
              >
                Fotos
              </button>
              <button
                type="button"
                class="btn-ghost"
                :class="{ 'response-detail-foot-tab--active': modalNutritionTab === 'metas' }"
                @click="modalNutritionTab = 'metas'"
              >
                Metas
              </button>
              <button
                type="button"
                class="btn-ghost"
                :class="{ 'response-detail-foot-tab--active': modalNutritionTab === 'desempenho' }"
                @click="modalNutritionTab = 'desempenho'"
              >
                Nutrição
              </button>
              <button
                type="button"
                class="btn-primary"
                @click="goToPatient(selectedResponse.user.id, 'resumo')"
              >
                Perfil do paciente
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { Calendar, CalendarDays, CalendarRange, Check, Eye, Image, LineChart, ListChecks, MessageSquare, Pencil, Plus, Power, Search, Trash2 } from 'lucide-vue-next'
import {
  buildAnswerRows,
  summarizeCheckinAnswers,
  formatCheckinPeriod,
} from '~/utils/checkin-answers'
import {
  CHECKIN_STEP_TYPE_OPTIONS,
  buildStepPayload,
  buildStepPreviewPayload,
  defaultEditorStep,
  editorStepFromApi,
} from '~/utils/checkin-step-schema'

definePageMeta({
  layout: false,
  middleware: 'nutri-only',
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const activeTab = ref('responses')
const loadingResponses = ref(false)
const loadingTemplates = ref(false)
const responses = ref([])
const templates = ref([])
const responseSearch = ref('')
const viewModalOpen = ref(false)
const selectedResponse = ref(null)
const modalNutritionTab = ref('fotos')
const dispatching = ref(false)
const dispatchMessage = ref('')
const dispatchStatus = ref({ dispatched: false, periodKey: '' })
const customDispatching = ref(false)
const customDispatchMessage = ref('')
const dispatchSchedules = ref([])
const dispatchPatients = ref([])
const dispatchPatientSearch = ref('')

const customDispatch = reactive({
  templateId: '',
  allPatients: false,
  userIds: [],
  periodDate: '',
  mode: 'now',
  scheduledAt: '',
  title: '',
  body: '',
})

const dispatchModeOptions = [
  { value: 'now', label: 'Agora' },
  { value: 'schedule', label: 'Programar data e hora' },
]

const dispatchTemplateOptions = computed(() =>
  templates.value
    .filter((tpl) => tpl.active)
    .map((tpl) => ({
      value: tpl.id,
      label: `${tpl.title} (${frequencyLabel(tpl.frequency)})`,
    })),
)

const dispatchPeriodHint = computed(() => {
  const tpl = templates.value.find((t) => t.id === customDispatch.templateId)
  if (!tpl) return 'Define a semana, dia ou mês da resposta. Vazio = período atual.'
  if (tpl.frequency === 'daily') return 'Dia da resposta (ex.: hoje). Vazio = hoje.'
  if (tpl.frequency === 'monthly') return 'Mês da resposta. Vazio = mês atual.'
  return 'Semana da resposta. Vazio = semana atual.'
})

const DISPATCH_PATIENT_SEARCH_MIN = 2
const DISPATCH_PATIENT_VISIBLE_LIMIT = 80

const filteredDispatchPatients = computed(() => {
  const q = dispatchPatientSearch.value.trim().toLowerCase()
  const all = dispatchPatients.value
  const needsSearch = all.length > DISPATCH_PATIENT_VISIBLE_LIMIT

  if (!q) {
    return needsSearch ? [] : all
  }

  const minLen = needsSearch ? DISPATCH_PATIENT_SEARCH_MIN : 1
  if (q.length < minLen) return []

  return all.filter((p) => p.name?.toLowerCase().includes(q))
})

const visibleDispatchPatients = computed(() =>
  filteredDispatchPatients.value.slice(0, DISPATCH_PATIENT_VISIBLE_LIMIT),
)

const dispatchPatientListHint = computed(() => {
  const total = dispatchPatients.value.length
  const q = dispatchPatientSearch.value.trim()
  const needsSearch = total > DISPATCH_PATIENT_VISIBLE_LIMIT

  if (!total) return 'Nenhum paciente cadastrado no sistema.'

  if (!q && needsSearch) {
    return `Há ${total} pacientes. Digite pelo menos ${DISPATCH_PATIENT_SEARCH_MIN} caracteres para buscar e selecionar.`
  }

  if (q) {
    const minLen = needsSearch ? DISPATCH_PATIENT_SEARCH_MIN : 1
    if (q.length < minLen) {
      return needsSearch
        ? `Digite pelo menos ${DISPATCH_PATIENT_SEARCH_MIN} caracteres para buscar.`
        : ''
    }
  }

  if (q && !filteredDispatchPatients.value.length) return ''

  if (filteredDispatchPatients.value.length > DISPATCH_PATIENT_VISIBLE_LIMIT) {
    return `Mostrando ${DISPATCH_PATIENT_VISIBLE_LIMIT} de ${filteredDispatchPatients.value.length} resultados. Refine a busca.`
  }

  return ''
})

const selectedDispatchPatients = computed(() => {
  const selected = new Set(customDispatch.userIds)
  return dispatchPatients.value.filter((p) => selected.has(p.id))
})

function removeDispatchPatient(id) {
  customDispatch.userIds = customDispatch.userIds.filter((userId) => userId !== id)
}

const customDispatchSubmitLabel = computed(() =>
  customDispatch.mode === 'schedule' ? 'Agendar disparo' : 'Enviar agora',
)

const frequencyOptions = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'daily', label: 'Diário' },
  { value: 'monthly', label: 'Mensal' },
]

const stepTypeOptions = CHECKIN_STEP_TYPE_OPTIONS

const editorOpen = ref(false)
const editorMode = ref('create')
const editorId = ref(null)
const editorError = ref('')
const savingTemplate = ref(false)
const editorPreviewStep = ref(0)

const defaultStep = () => defaultEditorStep()

const editor = reactive({
  title: '',
  description: '',
  frequency: 'weekly',
  active: true,
  steps: [defaultStep()],
})

const authHeaders = () => {
  const token = import.meta.client ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const filteredResponses = computed(() => {
  const q = responseSearch.value.trim().toLowerCase()
  if (!q) return responses.value
  return responses.value.filter((item) => {
    const name = item.user?.name?.toLowerCase() || ''
    const title = item.template?.title?.toLowerCase() || ''
    const summary = summarizeResponse(item).toLowerCase()
    return name.includes(q) || title.includes(q) || summary.includes(q)
  })
})

function frequencyLabel(freq) {
  if (freq === 'daily') return 'Diário'
  if (freq === 'monthly') return 'Mensal'
  return 'Semanal'
}

function frequencyIcon(freq) {
  if (freq === 'daily') return CalendarDays
  if (freq === 'monthly') return CalendarRange
  return Calendar
}

function templateQuestionCount(tpl) {
  return Array.isArray(tpl?.steps) ? tpl.steps.length : 0
}

const sortedTemplates = computed(() =>
  [...templates.value].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    const freqOrder = { weekly: 0, daily: 1, monthly: 2 }
    const fa = freqOrder[a.frequency] ?? 0
    const fb = freqOrder[b.frequency] ?? 0
    if (fa !== fb) return fa - fb
    return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR')
  }),
)

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPeriod(periodKey, frequency) {
  return formatCheckinPeriod(periodKey, frequency)
}

function summarizeResponse(item) {
  return summarizeCheckinAnswers(item.template?.steps, item.answers)
}

const answerRows = computed(() => {
  if (!selectedResponse.value) return []
  return buildAnswerRows(
    selectedResponse.value.template?.steps,
    selectedResponse.value.answers,
  )
})

function openViewModal(item, tab = 'fotos') {
  selectedResponse.value = item
  modalNutritionTab.value = tab === 'desempenho' ? 'desempenho' : tab === 'metas' ? 'metas' : 'fotos'
  viewModalOpen.value = true
}

function closeViewModal() {
  viewModalOpen.value = false
  selectedResponse.value = null
  modalNutritionTab.value = 'fotos'
}

function goToPatient(userId, tab = 'resumo') {
  if (!userId) return
  closeViewModal()
  const profileTab = tab === 'desempenho' ? 'nutricao' : tab
  navigateTo(`/usuarios/${userId}?tab=${profileTab}`)
}

async function loadResponses() {
  loadingResponses.value = true
  try {
    const data = await $fetch(`${apiBase}/checkin/responses`, { headers: authHeaders() })
    responses.value = data.responses || []
  } catch (err) {
    console.error(err)
  } finally {
    loadingResponses.value = false
  }
}

async function loadTemplates() {
  loadingTemplates.value = true
  try {
    const data = await $fetch(`${apiBase}/checkin/templates`, { headers: authHeaders() })
    templates.value = data.templates || []
  } catch (err) {
    console.error(err)
  } finally {
    loadingTemplates.value = false
  }
}

function buildPreviewSteps() {
  return editor.steps.map((step, index) => buildStepPreviewPayload(step, index))
}

const previewSteps = computed(() => buildPreviewSteps())

function focusPreviewStep(index) {
  editorPreviewStep.value = Math.min(
    Math.max(0, index),
    Math.max(0, editor.steps.length - 1),
  )
}

function resetEditor() {
  editor.title = ''
  editor.description = ''
  editor.frequency = 'weekly'
  editor.active = true
  editor.steps = [defaultStep()]
  editorError.value = ''
  editorId.value = null
  editorPreviewStep.value = 0
}

function openCreateTemplate() {
  editorMode.value = 'create'
  resetEditor()
  editorOpen.value = true
}

function openEditTemplate(tpl) {
  editorMode.value = 'edit'
  editorId.value = tpl.id
  editor.title = tpl.title
  editor.description = tpl.description || ''
  editor.frequency = tpl.frequency || 'weekly'
  editor.active = tpl.active !== false
  editor.steps = (Array.isArray(tpl.steps) ? tpl.steps : []).map((step) => editorStepFromApi(step))
  if (!editor.steps.length) editor.steps = [defaultStep()]
  editorError.value = ''
  editorPreviewStep.value = 0
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
}

function addStep() {
  if (editor.steps.length >= 20) {
    editorError.value = 'Máximo de 20 perguntas.'
    return
  }
  const step = defaultStep()
  step.id = `step_${editor.steps.length + 1}`
  editor.steps.push(step)
  editorPreviewStep.value = editor.steps.length - 1
}

function removeStep(index) {
  editor.steps.splice(index, 1)
  if (editorPreviewStep.value >= editor.steps.length) {
    editorPreviewStep.value = Math.max(0, editor.steps.length - 1)
  } else if (editorPreviewStep.value > index) {
    editorPreviewStep.value -= 1
  }
}

function onStepTypeChange(step) {
  if (step.type === 'choice' && !step.optionsText) {
    step.optionsText = 'Sim\nNão'
  }
  if (step.type === 'water') {
    if (!step.question) step.question = 'Quantos litros de água você bebeu?'
    if (!step.hint) step.hint = 'Conte o total do dia (água pura, chás sem açúcar, etc.).'
  }
  if (step.type === 'exercise') {
    if (!step.yesLabel) step.yesLabel = 'Sim, pratiquei hoje'
    if (!step.noLabel) step.noLabel = 'Não pratiquei hoje'
  }
  if (step.type === 'number' && !step.numberUnit) {
    step.numberUnit = ''
  }
  if (step.type === 'text' && !step.placeholder) {
    step.placeholder = 'Sua resposta...'
  }
}

function buildStepsPayload() {
  return editor.steps.map((step, index) => buildStepPayload(step, index))
}

async function saveTemplate() {
  editorError.value = ''
  savingTemplate.value = true
  try {
    const body = {
      title: editor.title.trim(),
      description: editor.description.trim() || null,
      frequency: editor.frequency,
      active: editor.active,
      steps: buildStepsPayload(),
    }
    if (!body.title) throw new Error('Título obrigatório.')

    if (editorMode.value === 'create') {
      await $fetch(`${apiBase}/checkin/templates`, {
        method: 'POST',
        headers: authHeaders(),
        body,
      })
    } else {
      await $fetch(`${apiBase}/checkin/templates/${editorId.value}`, {
        method: 'PUT',
        headers: authHeaders(),
        body,
      })
    }
    closeEditor()
    await loadTemplates()
  } catch (err) {
    editorError.value = err.data?.message || err.message || 'Erro ao salvar.'
  } finally {
    savingTemplate.value = false
  }
}

async function toggleTemplateActive(tpl) {
  try {
    await $fetch(`${apiBase}/checkin/templates/${tpl.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: { active: !tpl.active },
    })
    await loadTemplates()
  } catch (err) {
    alert(err.data?.message || 'Erro ao atualizar.')
  }
}

async function deleteTemplate(tpl) {
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Excluir check-in',
    message: `Excluir "${tpl.title}"? As respostas anteriores também serão removidas.`,
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
  try {
    await $fetch(`${apiBase}/checkin/templates/${tpl.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await loadTemplates()
  } catch (err) {
    alert(err.data?.message || 'Erro ao excluir.')
  }
}

async function loadDispatchStatus() {
  try {
    dispatchStatus.value = await $fetch(`${apiBase}/checkin/dispatch/status`, { headers: authHeaders() })
  } catch {
    dispatchStatus.value = { dispatched: false, periodKey: '' }
  }
}

async function loadDispatchSchedules() {
  try {
    const data = await $fetch(`${apiBase}/checkin/dispatch/schedules`, { headers: authHeaders() })
    dispatchSchedules.value = data.schedules || []
  } catch {
    dispatchSchedules.value = []
  }
}

async function loadDispatchPatients() {
  try {
    const users = await $fetch(`${apiBase}/users`, { headers: authHeaders() })
    dispatchPatients.value = Array.isArray(users)
      ? users.filter((u) => u.role === 'PACIENTE').map((u) => ({ id: u.id, name: u.name }))
      : []
  } catch {
    dispatchPatients.value = []
  }
}

function formatScheduleWhen(value) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function submitCustomDispatch() {
  customDispatchMessage.value = ''
  if (!customDispatch.templateId) {
    customDispatchMessage.value = 'Selecione um tipo de check-in.'
    return
  }
  if (!customDispatch.allPatients && !customDispatch.userIds.length) {
    customDispatchMessage.value = 'Selecione pelo menos um paciente ou marque todos.'
    return
  }

  customDispatching.value = true
  try {
    const body = {
      templateId: customDispatch.templateId,
      allPatients: customDispatch.allPatients,
      userIds: customDispatch.allPatients ? [] : [...customDispatch.userIds],
      periodDate: customDispatch.periodDate || null,
      title: customDispatch.title.trim() || null,
      body: customDispatch.body.trim() || null,
    }
    if (customDispatch.mode === 'schedule') {
      if (!customDispatch.scheduledAt) {
        customDispatchMessage.value = 'Informe data e hora do envio.'
        return
      }
      body.scheduledAt = new Date(customDispatch.scheduledAt).toISOString()
    }

    const result = await $fetch(`${apiBase}/checkin/dispatch/custom`, {
      method: 'POST',
      headers: authHeaders(),
      body,
    })
    customDispatchMessage.value = result.message || 'Disparo processado.'
    if (!result.scheduled) {
      customDispatch.userIds = []
    }
    await loadDispatchSchedules()
  } catch (err) {
    customDispatchMessage.value = err.data?.message || 'Não foi possível processar o disparo.'
  } finally {
    customDispatching.value = false
  }
}

async function cancelSchedule(id) {
  try {
    const result = await $fetch(`${apiBase}/checkin/dispatch/schedules/${id}/cancel`, {
      method: 'POST',
      headers: authHeaders(),
    })
    customDispatchMessage.value = result.message || 'Agendamento cancelado.'
    await loadDispatchSchedules()
  } catch (err) {
    customDispatchMessage.value = err.data?.message || 'Não foi possível cancelar.'
  }
}

async function dispatchWeeklyCheckIn() {
  dispatchMessage.value = ''
  dispatching.value = true
  try {
    const result = await $fetch(`${apiBase}/checkin/dispatch`, {
      method: 'POST',
      headers: authHeaders(),
      body: { force: true },
    })
    dispatchMessage.value = result.message || 'Disparo concluído.'
    await loadDispatchStatus()
  } catch (err) {
    dispatchMessage.value = err.data?.message || 'Não foi possível disparar o check-in.'
  } finally {
    dispatching.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadResponses(), loadTemplates(), loadDispatchStatus(), loadDispatchSchedules(), loadDispatchPatients()])
})
</script>

<style scoped>
.checkin-admin {
  --primary: #8B967C;
}

.checkin-dispatch-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
  padding: 1.15rem 1.25rem;
}

.checkin-dispatch-copy h2 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}

.checkin-dispatch-copy p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #555;
}

.checkin-dispatch-note {
  margin-top: 0.45rem !important;
  font-size: 0.82rem !important;
  font-weight: 600;
  color: var(--primary) !important;
}

.checkin-dispatch-btn {
  width: fit-content;
}

.checkin-dispatch-feedback {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--primary);
}

.checkin-dispatch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.checkin-custom-dispatch {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--admin-border, #e8ece9);
}

.checkin-custom-dispatch h3,
.dispatch-schedules h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.dispatch-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem 0.85rem;
  align-items: start;
  padding-top: 0.4rem;
}

.dispatch-field {
  position: relative;
  margin-top: 0.35rem;
  min-width: 0;
}

.dispatch-field--full {
  grid-column: 1 / -1;
}

.dispatch-field label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: 700;
  color: #444;
  line-height: 1;
}

.dispatch-field-hint {
  display: block;
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--admin-muted, #66706e);
}

.dispatch-control {
  width: 100%;
  min-height: 3rem;
  padding: 0.95rem 0.9rem 0.85rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1a2e24;
  box-sizing: border-box;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.dispatch-control:hover {
  border-color: #d4e5d1;
}

.dispatch-control:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.dispatch-field :deep(.cf-select),
.dispatch-field :deep(.cf-date-input),
.dispatch-field :deep(.cf-dt-input) {
  width: 100%;
}

.dispatch-field :deep(.cf-select-trigger),
.dispatch-field :deep(.cf-date-input-trigger),
.dispatch-field :deep(.cf-dt-trigger) {
  padding-top: 0.95rem;
  min-height: 3rem;
}

.field-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.72rem;
  color: var(--admin-muted, #66706e);
}

@media (max-width: 960px) {
  .dispatch-fields {
    grid-template-columns: 1fr;
  }
}

.dispatch-patients {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dispatch-patients-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.dispatch-all-check {
  margin: 0;
}

.dispatch-patient-tools {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.dispatch-patients-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.85rem;
  font-size: 0.78rem;
  color: var(--admin-muted, #66706e);
}

.dispatch-patients-selected {
  font-weight: 700;
  color: var(--primary, #2d5a39);
}

.dispatch-selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.dispatch-selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: #eef5ec;
  border: 1px solid #d4e5d1;
  font-size: 0.76rem;
  font-weight: 600;
  color: #2d5a39;
  line-height: 1.2;
}

.dispatch-selected-chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #5a7a5e;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
}

.dispatch-selected-chip-remove:hover {
  background: #d4e5d1;
  color: #1a2e24;
}

.dispatch-search {
  max-width: 100%;
}

.dispatch-patient-panel {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.55rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control, 10px);
  background: #fafbfa;
}

.dispatch-patient-hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--admin-muted, #66706e);
}

.dispatch-patient-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-height: 220px;
  overflow-y: auto;
}

.dispatch-patient-list li {
  margin: 0;
}

.dispatch-patient-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border-radius: var(--cf-radius-control, 8px);
  font-size: 0.84rem;
  transition: background 0.12s ease;
}

.dispatch-patient-item:hover {
  background: #fff;
}

.dispatch-patient-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dispatch-empty {
  margin: 0;
  font-size: 0.8rem;
  color: var(--admin-muted, #66706e);
}

.dispatch-schedules {
  padding-top: 0.75rem;
  border-top: 1px solid var(--admin-border, #e8ece9);
}

.dispatch-schedules ul {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.dispatch-schedule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 8px;
  font-size: 0.82rem;
}

.dispatch-schedule-item strong {
  display: block;
}

.dispatch-schedule-item span,
.dispatch-schedule-item small {
  display: block;
  color: var(--admin-muted, #66706e);
}

.checkin-tabs {
  display: inline-flex;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  padding: 0.3rem;
  background: #eef0eb;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 12px;
  width: fit-content;
}

.checkin-tab {
  border: none;
  background: transparent;
  padding: 0.6rem 1.1rem;
  border-radius: 9px;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--admin-muted, #66706e);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.checkin-tab:hover:not(.checkin-tab--active) {
  color: var(--admin-ink, #141414);
}

.checkin-tab--active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.nutri-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.templates-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 1rem 1.15rem;
}

.templates-toolbar-copy {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.templates-toolbar-copy strong {
  display: block;
  font-size: 0.95rem;
  color: var(--admin-ink, #141414);
}

.templates-toolbar-copy p {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: var(--admin-muted, #66706e);
  line-height: 1.45;
  max-width: 36rem;
}

.templates-count {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  background: var(--admin-primary-soft, #eef0eb);
  color: var(--primary);
  font-size: 1.1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.templates-create-btn {
  flex-shrink: 0;
  border-radius: 999px;
  padding-inline: 1.15rem;
}

.templates-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.templates-empty-btn {
  margin-top: 0.85rem;
  border-radius: 999px;
}

.nutri-search {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 320px;
}

.nutri-search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #9ca3af;
  pointer-events: none;
}

.nutri-search input {
  width: 100%;
  padding: 0.65rem 0.9rem 0.65rem 2.4rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.88rem;
  box-sizing: border-box;
}

.nutri-count {
  margin-left: auto;
  font-size: 0.82rem;
  font-weight: 600;
  color: #888;
}

.loading-row {
  padding: 2rem;
  text-align: center;
  color: #888;
}

.nutri-empty {
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.nutri-empty p {
  margin: 0 0 0.35rem;
  font-weight: 700;
}

.nutri-empty span {
  font-size: 0.88rem;
  color: #888;
}

.checkin-table-card {
  overflow: hidden;
}

.checkin-table-wrap {
  overflow-x: auto;
}

.checkin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.checkin-table th {
  padding: 0.75rem 0.85rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #888;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.checkin-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #f3f3f3;
  font-size: 0.86rem;
  color: #444;
  vertical-align: middle;
}

.checkin-row {
  cursor: pointer;
}

.checkin-row:hover td {
  background: #fafcfb;
}

.checkin-patient {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.checkin-name {
  font-weight: 700;
  color: #141414;
}

.checkin-date,
.checkin-summary {
  font-size: 0.82rem;
  color: #666;
}

.checkin-summary {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.th-actions,
.td-actions {
  text-align: right;
}

.th-actions,
.td-actions {
  text-align: right;
  white-space: nowrap;
}

.checkin-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.checkin-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  font-family: inherit;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.checkin-action-btn :deep(svg) {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

.checkin-action-btn--ghost {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #4b5563;
}

.checkin-action-btn--ghost:hover {
  border-color: #cfe3d2;
  background: #f6fbf7;
  color: var(--primary);
}

.checkin-action-btn--main {
  border: none;
  background: var(--primary);
  color: #fff;
  padding: 0.42rem 0.82rem;
}

.checkin-action-btn--main:hover {
  background: #244a20;
}

.templates-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-items: stretch;
}

.template-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 280px;
  padding: 0;
  overflow: hidden;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.template-card:hover {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.template-card--inactive {
  opacity: 0.82;
}

.template-card-accent {
  height: 4px;
  width: 100%;
  background: var(--primary);
}

.template-card-accent--daily {
  background: #5ba4d9;
}

.template-card-accent--weekly {
  background: var(--primary);
}

.template-card-accent--monthly {
  background: #c4842e;
}

.template-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.15rem 0.85rem;
  min-height: 0;
}

.template-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.template-card-title-wrap {
  min-width: 0;
}

.template-frequency {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--admin-muted, #66706e);
}

.template-frequency-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.template-card h3 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--admin-ink, #141414);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.template-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  flex-shrink: 0;
}

.template-desc {
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--admin-muted, #66706e);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.template-badge {
  flex-shrink: 0;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  background: #eef8f0;
  color: var(--primary);
  white-space: nowrap;
}

.template-badge--default {
  background: #f4f0e8;
  color: #8a6d3b;
}

.template-badge--off {
  background: #f3f4f6;
  color: #888;
}

.template-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.template-stats li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: #f8faf8;
  border: 1px solid var(--admin-border, #e8ece9);
  font-size: 0.78rem;
  color: var(--admin-muted, #66706e);
}

.template-stats strong {
  color: var(--admin-ink, #141414);
  font-weight: 800;
}

.template-stat-icon {
  width: 0.9rem;
  height: 0.9rem;
  color: var(--primary);
  flex-shrink: 0;
}

.template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid var(--admin-border, #e8ece9);
  background: #fafcfb;
}

.template-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.template-action:hover {
  background: #f8faf8;
  border-color: #c8dcc4;
  color: var(--admin-ink, #141414);
}

.template-action--primary {
  background: var(--admin-primary-soft, #eef0eb);
  border-color: color-mix(in srgb, var(--primary) 25%, #e8ece9);
  color: var(--primary);
}

.template-action--primary:hover {
  background: color-mix(in srgb, var(--primary) 12%, #fff);
}

.template-action--danger {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff;
}

.template-action--danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.template-action-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1rem;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.btn-ghost {
  padding: 0.45rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-sm {
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
}

.btn-danger-ghost {
  padding: 0.45rem 0.75rem;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff;
  color: #b91c1c;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
}

.modal-card {
  width: min(100%, 640px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.modal-card--editor {
  width: min(100%, 1120px);
  max-height: calc(100vh - 1.5rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.modal-card--editor .modal-head {
  flex-shrink: 0;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  flex: 1;
  min-height: 0;
  border-top: 1px solid #eee;
}

.editor-form {
  overflow: auto;
  padding: 1.1rem 1.35rem 1.35rem;
  min-height: 0;
  max-height: calc(100vh - 7.5rem);
  box-sizing: border-box;
}

.modal-card--editor .modal-fields {
  gap: 1rem;
}

.modal-card--editor .step-card .modal-fields {
  gap: 1rem;
}

.modal-card--editor .field--float input,
.modal-card--editor .field--float textarea {
  min-width: 0;
  max-width: 100%;
}

.modal-card--editor .modal-fields > .field--float {
  margin-top: 0.55rem;
}

.editor-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.editor-form-row--full {
  grid-template-columns: minmax(0, 1fr);
}

.editor-form-row--inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem 1rem;
}

.editor-form-row .field--float {
  margin-top: 0.7rem;
  min-width: 0;
}

.editor-step-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.15rem;
}

.editor-form-row-grow {
  flex: 1;
  min-width: 0;
}

.editor-preview {
  border-left: 1px solid #eee;
  background: linear-gradient(180deg, #f8faf9 0%, #f1f4f2 100%);
  padding: 1rem 0.85rem 1.25rem;
  overflow: auto;
  min-height: 0;
  max-height: calc(100vh - 7.5rem);
  box-sizing: border-box;
}

.editor-form-check {
  margin: 0;
  flex-shrink: 0;
  align-self: center;
  white-space: nowrap;
}

.cf-round-check {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  user-select: none;
}

.cf-round-check-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.cf-round-check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: #c5c9c5;
  color: #fff;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.12s ease;
}

.cf-round-check-icon {
  width: 0.78rem;
  height: 0.78rem;
  stroke-width: 3;
}

.cf-round-check-label {
  font-size: 0.84rem;
  font-weight: 600;
  color: #444;
}

.cf-round-check-input:checked + .cf-round-check-box {
  background: #62b054;
}

.cf-round-check-input:focus-visible + .cf-round-check-box {
  outline: 2px solid #9fc499;
  outline-offset: 2px;
}

.cf-round-check:active .cf-round-check-box {
  transform: scale(0.94);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #eee;
}

.modal-head h2 {
  margin: 0;
  font-size: 1.1rem;
}

.modal-close {
  border: none;
  background: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: #888;
}

.modal-body {
  padding: 1.25rem;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid #eee;
}

.response-detail-card {
  max-width: min(72rem, 96vw);
  width: 100%;
  max-height: calc(100dvh - 2rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.response-detail-head {
  flex-shrink: 0;
  align-items: center;
  gap: 1rem;
  padding: 1.35rem 1.5rem 1.2rem;
}

.response-detail-head .modal-close {
  align-self: flex-start;
  margin-top: 0.15rem;
  padding: 0.25rem 0.35rem;
}

.response-detail-head-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 1;
}

.response-detail-head-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.response-detail-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
  line-height: 1.2;
}

.response-detail-name {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.2;
  color: #111827;
}

.response-detail-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: #6b7280;
  line-height: 1.4;
}

.response-detail-meta span:not(:last-child)::after {
  content: '·';
  margin-left: 0.5rem;
  color: #d1d5db;
  font-weight: 400;
}

.response-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 1.25rem;
  padding: 1.15rem 1.5rem 1.25rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.response-detail-checkin {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding-top: 0.1rem;
}

.response-detail-nutrition {
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding-right: 0.15rem;
  padding-top: 0.1rem;
}

.response-detail-subtitle {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  line-height: 1.2;
}

@media (max-width: 900px) {
  .response-detail-layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    overflow: hidden;
  }

  .response-detail-nutrition {
    overflow-y: auto;
  }
}

.response-detail-foot {
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
  margin-top: 0;
}

.response-detail-foot-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.response-detail-foot-tab--active {
  border-color: #cfe3d2;
  background: #f0fdf4;
  color: var(--primary);
}

.response-detail-foot-close {
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .response-detail-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .response-detail-foot-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .response-detail-foot-actions .btn-primary {
    grid-column: 1 / -1;
  }

  .templates-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .templates-create-btn {
    width: 100%;
    justify-content: center;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }
}

.response-detail-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0;
}

.response-answer-row {
  padding: 0.85rem 1rem;
  border: 1px solid #eee;
  border-radius: 12px;
  background: #fafafa;
}

.response-answer-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

.response-answer-value {
  display: block;
  font-size: 1rem;
  color: #1f2937;
}

.response-answer-question {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.form-row {
  margin-bottom: 0.9rem;
}

.form-row label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #444;
}

.form-row input,
.form-row textarea,
.form-row select {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-row-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: flex-end;
}

.form-row-inline .form-row {
  flex: 1;
  min-width: 140px;
}

.form-check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #444;
  padding-bottom: 0.9rem;
}

.steps-block {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.steps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.steps-head h3 {
  margin: 0;
  font-size: 0.95rem;
}

.step-card {
  padding: 1rem 1.05rem 1.1rem;
  margin-bottom: 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: 12px;
  background: #fafcfb;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-sizing: border-box;
}

.step-card:hover {
  border-color: #c5cfc4;
}

.step-card--active {
  border-color: var(--primary, #8B967C);
  box-shadow: 0 0 0 2px rgba(139, 150, 124, 0.18);
  background: #fff;
}

.step-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.error-text {
  color: #c53030;
  font-size: 0.84rem;
  font-weight: 600;
}

@media (max-width: 900px) {
  .modal-card--editor {
    max-height: calc(100vh - 1rem);
  }

  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-form,
  .editor-preview {
    max-height: none;
  }

  .editor-preview {
    border-left: none;
    border-top: 1px solid #eee;
  }
}
</style>
