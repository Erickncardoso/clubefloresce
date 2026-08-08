<template>
  <div v-if="open" class="save-contact-modal-backdrop" @click.self="$emit('cancel')">
    <div class="save-contact-modal">
      <h4>Novo contato</h4>

      <label class="save-contact-field">
        Nome
        <input :value="form.name" type="text" placeholder="Nome do contato" @input="update('name', $event.target.value)" />
      </label>
      <label class="save-contact-field">
        Sobrenome
        <input :value="form.lastName" type="text" placeholder="Sobrenome" @input="update('lastName', $event.target.value)" />
      </label>
      <div class="save-contact-row">
        <label class="save-contact-field compact">
          País
          <select :value="form.countryCode" @change="update('countryCode', $event.target.value)">
            <option value="55">BR +55</option>
          </select>
        </label>
        <label class="save-contact-field compact">
          Número de telefone
          <input :value="form.localPhone" type="text" placeholder="11 96843-5031" @input="update('localPhone', $event.target.value)" />
        </label>
      </div>
      <label class="save-contact-field">
        Telefone completo
        <input :value="form.phone" type="text" placeholder="5511999999999" readonly />
      </label>
      <p class="save-contact-hint">Esse número de telefone já está no WhatsApp.</p>
      <p v-if="feedback" class="save-contact-feedback">{{ feedback }}</p>
      <div class="save-contact-actions">
        <button type="button" class="save-contact-cancel" @click="$emit('cancel')">Cancelar</button>
        <button type="button" class="save-contact-confirm" :disabled="saving" @click="$emit('confirm')">
          {{ saving ? 'Salvando...' : 'Confirmar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  form: { type: Object, default: () => ({ name: '', lastName: '', countryCode: '55', localPhone: '', phone: '' }) },
  saving: { type: Boolean, default: false },
  feedback: { type: String, default: '' }
})

const emit = defineEmits(['confirm', 'cancel', 'update:form'])

const update = (field, value) => {
  emit('update:form', { ...props.form, [field]: value })
}
</script>
