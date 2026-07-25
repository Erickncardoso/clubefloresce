<template>
  <form class="pca" @submit.prevent="onSubmit">
    <div class="pca-grid">
      <div class="field field--float">
        <label for="pca-name">Nome</label>
        <input id="pca-name" v-model="form.name" required placeholder="Nome completo">
      </div>
      <div class="field field--float">
        <label for="pca-nickname">Apelido</label>
        <input id="pca-nickname" v-model="form.nickname" placeholder="Como prefere ser chamada">
      </div>
      <div class="field field--float">
        <label for="pca-email">E-mail</label>
        <input id="pca-email" :value="form.email" type="email" disabled>
      </div>
      <SharedCfPhoneInput
        v-model="form.phone"
        class="pca-phone"
        label="Celular"
        input-id="pca-phone"
      />
      <div class="field field--float">
        <label for="pca-gender">Gênero</label>
        <SharedCfSelect id="pca-gender" v-model="form.gender" :options="genderOptions" />
      </div>
      <div class="field field--float">
        <label for="pca-birth">Nascimento</label>
        <SharedCfDateInput id="pca-birth" v-model="form.birthDate" />
      </div>
      <div class="field field--float">
        <label for="pca-cpf">CPF</label>
        <input
          id="pca-cpf"
          :value="form.cpf"
          inputmode="numeric"
          maxlength="14"
          placeholder="000.000.000-00"
          @input="onCpfInput"
        >
      </div>
    </div>

    <div class="pca-block">
      <span class="pca-label">Tags</span>
      <PatientsPatientTagPicker v-model="form.tagItems" />
    </div>

    <div class="pca-grid pca-grid--4">
      <div class="field field--float">
        <label for="pca-city">Cidade</label>
        <input id="pca-city" v-model="form.city" placeholder="Cidade">
      </div>
      <div class="field field--float">
        <label for="pca-state">UF</label>
        <SharedCfSelect id="pca-state" v-model="form.state" :options="stateOptions" />
      </div>
      <div class="field field--float">
        <label for="pca-occupation">Ocupação</label>
        <input id="pca-occupation" v-model="form.occupation" placeholder="Profissão">
      </div>
      <div class="field field--float">
        <label for="pca-marital">Estado civil</label>
        <SharedCfSelect id="pca-marital" v-model="form.maritalStatus" :options="maritalOptions" />
      </div>
    </div>

    <div class="pca-grid">
      <div class="field field--float">
        <label for="pca-modality">Modalidade</label>
        <SharedCfSelect id="pca-modality" v-model="form.modality" :options="modalityOptions" />
      </div>
      <div class="pca-checks">
        <label class="pca-check">
          <input v-model="form.athlete" type="checkbox">
          Atleta
        </label>
        <label class="pca-check">
          <input v-model="form.pregnant" type="checkbox">
          Gestante
        </label>
        <label class="pca-check">
          <input v-model="form.lactating" type="checkbox">
          Lactante
        </label>
      </div>
    </div>

    <div class="field field--float">
      <label for="pca-objective">Objetivo</label>
      <input id="pca-objective" v-model="form.objective" placeholder="Ex: Emagrecimento com saúde">
    </div>

    <div class="field field--float">
      <label for="pca-notes">Anotações</label>
      <textarea id="pca-notes" v-model="form.notes" rows="4" placeholder="Observações clínicas..." />
    </div>

    <div class="pca-grid pca-grid--address-top">
      <div class="field field--float">
        <label for="pca-cep">CEP</label>
        <input
          id="pca-cep"
          :value="form.zipCode"
          inputmode="numeric"
          maxlength="9"
          placeholder="00000-000"
          @input="onCep"
        >
        <p v-if="lookingUpCep" class="pca-hint">Buscando endereço…</p>
        <p v-else-if="cepLookupError" class="pca-hint pca-hint--error">{{ cepLookupError }}</p>
      </div>
      <div class="field field--float">
        <label for="pca-neighborhood">Bairro</label>
        <input id="pca-neighborhood" v-model="form.neighborhood" placeholder="Nome do bairro">
      </div>
    </div>

    <div class="pca-grid pca-grid--address-bottom">
      <div class="field field--float">
        <label for="pca-street">Rua</label>
        <input id="pca-street" v-model="form.street" placeholder="Nome da rua">
      </div>
      <div class="field field--float">
        <label for="pca-number">Número</label>
        <input id="pca-number" v-model="form.streetNumber" placeholder="Nº">
      </div>
    </div>

    <p v-if="error" class="pca-msg pca-msg--error">{{ error }}</p>
    <p v-else-if="success" class="pca-msg pca-msg--ok">{{ success }}</p>

    <div class="pca-actions">
      <button type="submit" class="btn-primary" :disabled="saving">
        {{ saving ? 'Salvando…' : 'Salvar dados cadastrais' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { h } from 'vue'
import { formatCpfMask } from '~/composables/useQuickAddPatient.js'
import { profileToAnamneseForm } from '~/composables/usePatientChart.js'
import ModalityIcon from '~/components/patients/ModalityIcon.vue'

const props = defineProps({
  user: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  success: { type: String, default: '' },
  lookingUpCep: { type: Boolean, default: false },
  cepLookupError: { type: String, default: '' },
})

const emit = defineEmits(['save', 'cep-input'])

function modalityIcon(name) {
  return {
    name: `ModalityIcon_${name || 'unset'}`,
    render() {
      return h(ModalityIcon, { name })
    },
  }
}

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const genderOptions = [
  { value: '', label: 'Não informado' },
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Outro' },
  { value: 'prefer_not_say', label: 'Prefiro não dizer' },
]

const maritalOptions = [
  { value: '', label: 'Não informado' },
  { value: 'single', label: 'Solteira(o)' },
  { value: 'married', label: 'Casada(o)' },
  { value: 'stable_union', label: 'União estável' },
  { value: 'divorced', label: 'Divorciada(o)' },
  { value: 'widowed', label: 'Viúva(o)' },
  { value: 'other', label: 'Outro' },
]

const modalityOptions = [
  { value: '', label: 'Não informado', icon: modalityIcon('unset') },
  { value: 'online', label: 'Online', icon: modalityIcon('online') },
  { value: 'presencial', label: 'Presencial', icon: modalityIcon('presencial') },
]

const stateOptions = [
  { value: '', label: 'UF' },
  ...BR_STATES.map((uf) => ({ value: uf, label: uf })),
]

const form = reactive(profileToAnamneseForm(props.user))

watch(
  () => props.user,
  (next) => {
    Object.assign(form, profileToAnamneseForm(next))
  },
)

function onCpfInput(event) {
  form.cpf = formatCpfMask(event?.target?.value ?? form.cpf)
}

function onCep(event) {
  emit('cep-input', event, form)
}

function onSubmit() {
  emit('save', { ...form, tagItems: [...form.tagItems] })
}
</script>

<style scoped>
.pca {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  background: #fff;
  border: 1.5px solid #e8ece9;
  padding: 1.15rem 1.25rem 1.35rem;
}

.pca :deep(.field--float) {
  position: relative;
  margin-top: 0.35rem;
}

.pca :deep(.field--float > label) {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: 600;
  color: #444;
  line-height: 1;
}

.pca :deep(.field input),
.pca :deep(.field textarea) {
  width: 100%;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #e8ece9;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  box-shadow: none;
}

.pca :deep(.field input:focus),
.pca :deep(.field textarea:focus) {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: none;
}

.pca :deep(.field input:disabled) {
  background: #f5f6f5;
  color: #8a9288;
}

.pca :deep(.field--float input),
.pca :deep(.field--float textarea) {
  padding-top: 0.95rem;
}

.pca :deep(.cf-phone-field) {
  margin-top: 0.35rem;
}

.pca-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.pca-grid--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pca-grid--address-top {
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
}

.pca-grid--address-bottom {
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.6fr);
}

.pca-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.pca-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7368;
}

.pca-checks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  padding-top: 0.85rem;
}

.pca-check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #2c322c;
  cursor: pointer;
}

.pca-check input {
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 0.4rem;
  accent-color: #8b967c;
}

.pca-hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: #6b7368;
}

.pca-hint--error {
  color: #c53030;
}

.pca-msg {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
}

.pca-msg--error {
  color: #c53030;
}

.pca-msg--ok {
  color: #2f6b3a;
}

.pca-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .pca-grid,
  .pca-grid--4,
  .pca-grid--address-top,
  .pca-grid--address-bottom {
    grid-template-columns: 1fr;
  }
}
</style>
