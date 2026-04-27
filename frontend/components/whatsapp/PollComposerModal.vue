<template>
  <div v-if="open" class="poll-modal-backdrop" @click.self="$emit('cancel')">
    <section class="poll-modal" role="dialog" aria-modal="true" aria-label="Criar mensagem interativa">
      <header class="poll-modal-header">
        <button type="button" class="poll-close-btn" @click="$emit('cancel')">✕</button>
        <h3>Mensagem interativa</h3>
      </header>

      <div class="poll-modal-body">
        <label class="poll-field-label">Tipo</label>
        <select
          :value="form.type"
          class="poll-input poll-select"
          :disabled="sending"
          @change="updateField('type', $event.target.value)"
        >
          <option value="poll">Enquete</option>
          <option value="button">Botões</option>
          <option value="list">Lista</option>
          <option value="carousel">Carrossel</option>
          <option value="request-payment">Solicitar pagamento</option>
          <option value="pix-button">Botão PIX</option>
        </select>

        <label class="poll-field-label">Texto principal</label>
        <input
          :value="form.text"
          class="poll-input"
          type="text"
          placeholder="Digite o texto principal"
          :disabled="sending"
          @input="updateField('text', $event.target.value)"
        />

        <template v-if="form.type === 'button'">
          <label class="poll-field-label">Botões de ação</label>
          <InteractiveButtonsBuilder
            :model-value="form.choicesText"
            :disabled="sending"
            @update:model-value="updateField('choicesText', $event)"
          />
        </template>
        <template v-else-if="form.type !== 'carousel' && form.type !== 'request-payment' && form.type !== 'pix-button'">
          <label class="poll-field-label">Opções (1 por linha)</label>
          <textarea
            :value="form.choicesText"
            class="poll-input poll-textarea"
            :placeholder="choicesPlaceholder"
            :disabled="sending"
            @input="updateField('choicesText', $event.target.value)"
          />
        </template>

        <template v-if="form.type === 'carousel'">
          <label class="poll-field-label">Cartões do carrossel</label>
          <InteractiveCarouselBuilder
            :model-value="form.carouselCardsText"
            :disabled="sending"
            @update:model-value="updateField('carouselCardsText', $event)"
          />
        </template>

        <label v-if="form.type === 'button' || form.type === 'list'" class="poll-field-label">Rodapé (opcional)</label>
        <input
          v-if="form.type === 'button' || form.type === 'list'"
          :value="form.footerText"
          class="poll-input"
          type="text"
          placeholder="Texto de rodapé"
          :disabled="sending"
          @input="updateField('footerText', $event.target.value)"
        />

        <label v-if="form.type === 'list'" class="poll-field-label">Texto do botão da lista</label>
        <input
          v-if="form.type === 'list'"
          :value="form.listButton"
          class="poll-input"
          type="text"
          placeholder="Ver opções"
          :disabled="sending"
          @input="updateField('listButton', $event.target.value)"
        />

        <label v-if="form.type === 'button'" class="poll-field-label">Imagem do botão (URL/base64, opcional)</label>
        <input
          v-if="form.type === 'button'"
          :value="form.imageButton"
          class="poll-input"
          type="text"
          placeholder="https://..."
          :disabled="sending"
          @input="updateField('imageButton', $event.target.value)"
        />

        <label v-if="form.type === 'poll'" class="poll-toggle-row">
          <span>Permitir várias respostas</span>
          <input
            :checked="Boolean(form.allowMultiple)"
            type="checkbox"
            :disabled="sending"
            @change="updateField('allowMultiple', $event.target.checked)"
          />
        </label>

        <template v-if="form.type === 'request-payment' || form.type === 'pix-button'">
          <label class="poll-field-label">Tipo da chave PIX</label>
          <select
            :value="form.pixType"
            class="poll-input poll-select"
            :disabled="sending"
            @change="updateField('pixType', $event.target.value)"
          >
            <option value="EVP">EVP</option>
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="PHONE">PHONE</option>
            <option value="EMAIL">EMAIL</option>
          </select>

          <label class="poll-field-label">Chave PIX</label>
          <input
            :value="form.pixKey"
            class="poll-input"
            type="text"
            placeholder="Digite a chave PIX"
            :disabled="sending"
            @input="updateField('pixKey', $event.target.value)"
          />

          <label class="poll-field-label">Nome do recebedor (opcional)</label>
          <input
            :value="form.pixName"
            class="poll-input"
            type="text"
            placeholder="Ex: Loja Exemplo"
            :disabled="sending"
            @input="updateField('pixName', $event.target.value)"
          />
        </template>

        <template v-if="form.type === 'request-payment'">
          <label class="poll-field-label">Valor (BRL)</label>
          <input
            :value="form.amount"
            class="poll-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="199.90"
            :disabled="sending"
            @input="updateField('amount', $event.target.value)"
          />

          <label class="poll-field-label">Nome do item (opcional)</label>
          <input
            :value="form.itemName"
            class="poll-input"
            type="text"
            placeholder="Assinatura Plano Ouro"
            :disabled="sending"
            @input="updateField('itemName', $event.target.value)"
          />

          <label class="poll-field-label">Número da fatura (opcional)</label>
          <input
            :value="form.invoiceNumber"
            class="poll-input"
            type="text"
            placeholder="PED-123"
            :disabled="sending"
            @input="updateField('invoiceNumber', $event.target.value)"
          />

          <label class="poll-field-label">Link de pagamento (opcional)</label>
          <input
            :value="form.paymentLink"
            class="poll-input"
            type="text"
            placeholder="https://pagamentos.exemplo.com/checkout/abc"
            :disabled="sending"
            @input="updateField('paymentLink', $event.target.value)"
          />

          <label class="poll-field-label">URL do arquivo (opcional)</label>
          <input
            :value="form.fileUrl"
            class="poll-input"
            type="text"
            placeholder="https://cdn.exemplo.com/boleto.pdf"
            :disabled="sending"
            @input="updateField('fileUrl', $event.target.value)"
          />

          <label class="poll-field-label">Nome do arquivo (opcional)</label>
          <input
            :value="form.fileName"
            class="poll-input"
            type="text"
            placeholder="boleto-123.pdf"
            :disabled="sending"
            @input="updateField('fileName', $event.target.value)"
          />

          <label class="poll-field-label">Linha digitável do boleto (opcional)</label>
          <input
            :value="form.boletoCode"
            class="poll-input"
            type="text"
            placeholder="34191.79001..."
            :disabled="sending"
            @input="updateField('boletoCode', $event.target.value)"
          />
        </template>


        <template v-if="form.type === 'list'">
          <label class="poll-field-label">Opções da lista</label>
          <InteractiveListBuilder
            :model-value="form.choicesText"
            :disabled="sending"
            @update:model-value="updateField('choicesText', $event)"
          />
        </template>

      </div>

      <footer class="poll-modal-footer">
        <button
          type="button"
          class="poll-submit-btn"
          :disabled="sending || !canSubmit"
          @click="$emit('confirm')"
        >
          {{ sending ? 'Enviando...' : 'Enviar mensagem interativa' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import InteractiveListBuilder from '~/components/whatsapp/InteractiveListBuilder.vue'
import InteractiveButtonsBuilder from '~/components/whatsapp/InteractiveButtonsBuilder.vue'
import InteractiveCarouselBuilder from '~/components/whatsapp/InteractiveCarouselBuilder.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
  form: {
    type: Object,
    default: () => ({
      type: 'poll',
      text: '',
      choicesText: '',
      footerText: '',
      listButton: 'Ver opções',
      imageButton: '',
      allowMultiple: false,
      carouselCardsText: '',
      amount: '',
      pixKey: '',
      pixType: 'EVP',
      pixName: '',
      paymentLink: '',
      fileUrl: '',
      fileName: '',
      boletoCode: '',
      invoiceNumber: '',
      itemName: ''
    })
  }
})

const emit = defineEmits(['cancel', 'confirm', 'update:form'])

const sanitizeForm = (draft) => ({
  type: String(draft?.type || 'poll'),
  text: String(draft?.text || ''),
  choicesText: String(draft?.choicesText || ''),
  footerText: String(draft?.footerText || ''),
  listButton: String(draft?.listButton || 'Ver opções'),
  imageButton: String(draft?.imageButton || ''),
  allowMultiple: Boolean(draft?.allowMultiple),
  carouselCardsText: String(draft?.carouselCardsText || ''),
  amount: String(draft?.amount || ''),
  pixKey: String(draft?.pixKey || ''),
  pixType: String(draft?.pixType || 'EVP'),
  pixName: String(draft?.pixName || ''),
  paymentLink: String(draft?.paymentLink || ''),
  fileUrl: String(draft?.fileUrl || ''),
  fileName: String(draft?.fileName || ''),
  boletoCode: String(draft?.boletoCode || ''),
  invoiceNumber: String(draft?.invoiceNumber || ''),
  itemName: String(draft?.itemName || '')
})

const updateField = (key, value) => {
  const next = sanitizeForm(props.form)
  next[key] = value
  emit('update:form', next)
}

const choicesPlaceholder = computed(() => {
  const type = String(props.form?.type || 'poll')
  if (type === 'poll') return 'Opção 1\nOpção 2'
  if (type === 'button') return 'Suporte|suporte\nSite|https://exemplo.com'
  if (type === 'list') return 'Use o construtor visual abaixo'
  return '[Título\\nDescrição]\n{https://imagem.jpg}\nComprar|https://exemplo.com'
})
const canSubmit = computed(() => {
  const text = String(props.form?.text || '').trim()
  const options = String(props.form?.choicesText || '')
    .split('\n')
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  const type = String(props.form?.type || 'poll')
  if (type !== 'pix-button' && !text) return false
  if (type === 'poll') return options.length >= 2
  if (type === 'carousel') return String(props.form?.carouselCardsText || '').trim().length > 0
  if (type === 'request-payment') return Number(props.form?.amount || 0) > 0 && String(props.form?.pixKey || '').trim().length > 0
  if (type === 'pix-button') return String(props.form?.pixKey || '').trim().length > 0
  return options.length >= 1
})
</script>

<style scoped>
.poll-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10080;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.poll-modal {
  width: min(520px, 100%);
  max-height: min(88vh, 760px);
  border-radius: 18px;
  background: #0f1720;
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.poll-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}
.poll-modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}
.poll-close-btn {
  border: none;
  background: transparent;
  color: #d1d5db;
  cursor: pointer;
  font-size: 1.1rem;
}
.poll-modal-body {
  padding: 8px 14px 0;
  overflow: auto;
}
.poll-field-label {
  display: block;
  margin: 14px 0 8px;
  font-weight: 600;
}
.poll-input {
  width: 100%;
  height: 42px;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: #f3f4f6;
  outline: none;
  font-size: 0.95rem;
}
.poll-select {
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 0 10px;
  background: #0b1220;
  color: #f3f4f6;
}
.poll-select option {
  background: #f8fafc;
  color: #0f172a;
}
.poll-textarea { min-height: 138px; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 10px; padding: 10px; resize: vertical; }
.poll-input:focus {
  border-bottom-color: #22c55e;
}
.poll-helper-text {
  margin: 12px 0 4px;
  color: #94a3b8;
  font-size: 0.82rem;
}
.poll-options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.poll-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.poll-remove-option {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
}
.poll-add-option {
  margin-top: 10px;
  border: none;
  background: transparent;
  color: #22c55e;
  font-weight: 600;
  cursor: pointer;
}
.poll-toggle-row {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.poll-toggle-row input {
  width: 18px;
  height: 18px;
}
.poll-modal-footer {
  margin-top: auto;
  padding: 14px;
  background: rgba(148, 163, 184, 0.08);
}
.poll-submit-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 999px;
  font-weight: 700;
  color: #052e16;
  background: #22c55e;
  cursor: pointer;
}
.poll-submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
